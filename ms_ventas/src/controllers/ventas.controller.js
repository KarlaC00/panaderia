const pool = require('../config/db');
const { publicarVenta } = require('../events/publisher');

// ── POST /ventas ── Registrar una venta ───────────────────────────────────────
// Cubre: REQ-V01, REQ-V02, REQ-V03, REQ-V04, REQ-V05
// Historia: MX-V01-2026 (escenarios 1, 2, 3, 4)
// Regla de negocio: RN-01 (stock nunca negativo – validado en ms_inventario vía evento)
const registrar = async (req, res) => {
  const { items } = req.body;
  // items: [{ producto_id, nombre_producto, cantidad, precio_unitario }]

  // REQ-V04 / Escenario 2: Campos obligatorios vacíos
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un producto' });
  }

  for (const item of items) {
    // REQ-V04: producto y cantidad obligatorios
    if (!item.producto_id) {
      return res.status(400).json({ error: 'Cada ítem debe tener producto_id' });
    }
    // REQ-V05 / Escenario 3: Cantidad cero o negativa
    if (!item.cantidad || item.cantidad <= 0) {
      return res.status(400).json({
        error: 'La cantidad de cada producto debe ser mayor a 0',
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // REQ-V01: Calcular monto total de la venta
    const montoTotal = items.reduce(
      (sum, i) => sum + i.cantidad * (i.precio_unitario || 0),
      0
    );

    // REQ-V02: La fecha/hora se registra automáticamente con DEFAULT NOW() en la tabla
    // 1. Crear la venta
    const ventaResult = await client.query(
      `INSERT INTO venta (usuario_id, monto_total)
       VALUES ($1, $2)
       RETURNING id`,
      [req.usuario.id, montoTotal]
    );
    const ventaId = ventaResult.rows[0].id;

    // 2. Insertar detalles de venta (REQ-V01, REQ-V09)
    for (const item of items) {
      const subtotal = item.cantidad * (item.precio_unitario || 0);
      await client.query(
        `INSERT INTO detalle_venta
           (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          ventaId,
          item.producto_id,
          item.nombre_producto || '',
          item.cantidad,
          item.precio_unitario || 0,
          subtotal,
        ]
      );
    }

    // 3. Patrón Outbox: garantizar entrega del evento aunque RabbitMQ esté caído
    //    Cubre REQ-E01, REQ-E03
    const payload = {
      ventaId,
      usuarioId: req.usuario.id,
      items: items.map((i) => ({
        productoId: i.producto_id,
        cantidad: i.cantidad,
      })),
    };

    await client.query(
      `INSERT INTO evento_venta (venta_id, tipo, payload)
       VALUES ($1, $2, $3)`,
      [ventaId, 'venta_registrada', JSON.stringify(payload)]
    );

    await client.query('COMMIT');

    // 4. Publicar a RabbitMQ (best-effort; el outbox sirve de respaldo – REQ-E01, REQ-E03)
    const publicado = await publicarVenta(payload);
    if (publicado) {
      await pool.query(
        `UPDATE evento_venta
         SET estado = 'publicado', publicado_en = NOW()
         WHERE venta_id = $1 AND tipo = 'venta_registrada'`,
        [ventaId]
      );
    }

    // REQ-V06: Confirmación visual → respuesta 201 con datos de la venta
    res.status(201).json({
      mensaje: 'Venta registrada correctamente',
      ventaId,
      montoTotal,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[registrar venta]', err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  } finally {
    client.release();
  }
};

// ── GET /ventas ── Historial de ventas ────────────────────────────────────────
// Cubre: REQ-V07, REQ-V08, REQ-V09, REQ-V10
// Historias: MX-V02-2026, MX-V02A-2026 (todos los escenarios)
const listar = async (req, res) => {
  const { fecha_inicio, fecha_fin, producto } = req.query;
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const offset = (page - 1) * limit;

  // REQ-V10 / Escenario 4 (MX-V02): Rango de fechas inválido
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
    return res.status(400).json({
      error: 'La fecha de inicio no puede ser mayor que la fecha de fin',
    });
  }

  // Construcción dinámica de filtros con $N (PostgreSQL)
  const condiciones = [`v.estado = 'confirmada'`];
  const params = [];

  if (fecha_inicio) {
    params.push(fecha_inicio);
    condiciones.push(`DATE(v.fecha_hora) >= $${params.length}`);
  }
  if (fecha_fin) {
    params.push(fecha_fin);
    condiciones.push(`DATE(v.fecha_hora) <= $${params.length}`);
  }
  if (producto) {
    params.push(`%${producto}%`);
    condiciones.push(`dv.nombre_producto ILIKE $${params.length}`);
  }

  const where = condiciones.join(' AND ');

  try {
    // REQ-V09: cada fila incluye producto, cantidad, fecha/hora y monto
    const dataQuery = `
      SELECT
        v.id,
        v.fecha_hora,
        v.monto_total,
        dv.producto_id,
        dv.nombre_producto,
        dv.cantidad,
        dv.precio_unitario,
        dv.subtotal
      FROM venta v
      JOIN detalle_venta dv ON v.id = dv.venta_id
      WHERE ${where}
      ORDER BY v.fecha_hora DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const { rows } = await pool.query(dataQuery, [...params, limit, offset]);

    // Total para paginación
    const countQuery = `
      SELECT COUNT(DISTINCT v.id) AS total
      FROM venta v
      JOIN detalle_venta dv ON v.id = dv.venta_id
      WHERE ${where}
    `;
    const { rows: countRows } = await pool.query(countQuery, params);

    // REQ-V10 / Escenario 2: Retorna lista vacía, no error
    res.json({
      datos: rows,
      paginacion: {
        pagina: page,
        limite: limit,
        total: parseInt(countRows[0].total, 10),
      },
    });
  } catch (err) {
    console.error('[listar ventas]', err);
    res.status(500).json({ error: 'Error al consultar el historial' });
  }
};

// ── GET /ventas/resumen ── Datos para Dashboard ───────────────────────────────
// Cubre: REQ-D02, REQ-D03
// Historia: MX-D01-2026 / MX-D01A-2026 (escenario 2)
const resumen = async (req, res) => {
  try {
    // Ventas del día
    const { rows: hoy } = await pool.query(`
      SELECT
        COUNT(DISTINCT v.id)          AS transacciones,
        COALESCE(SUM(v.monto_total), 0) AS total
      FROM venta v
      WHERE DATE(v.fecha_hora) = CURRENT_DATE
        AND v.estado = 'confirmada'
    `);

    // Top 5 productos del día (REQ-D02: productos más vendidos)
    const { rows: topProductos } = await pool.query(`
      SELECT
        dv.nombre_producto,
        SUM(dv.cantidad) AS total_vendido
      FROM detalle_venta dv
      JOIN venta v ON v.id = dv.venta_id
      WHERE DATE(v.fecha_hora) = CURRENT_DATE
        AND v.estado = 'confirmada'
      GROUP BY dv.nombre_producto
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    // Ventas de la semana en curso (REQ-D03)
    const { rows: semana } = await pool.query(`
      SELECT
        COUNT(DISTINCT v.id)            AS transacciones,
        COALESCE(SUM(v.monto_total), 0) AS total
      FROM venta v
      WHERE DATE_TRUNC('week', v.fecha_hora) = DATE_TRUNC('week', CURRENT_DATE)
        AND v.estado = 'confirmada'
    `);

    res.json({
      hoy:         hoy[0],
      semana:      semana[0],
      topProductos,
    });
  } catch (err) {
    console.error('[resumen ventas]', err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

module.exports = { registrar, listar, resumen };