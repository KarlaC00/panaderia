const pool = require('../config/db');
const { publicarVenta } = require('../events/publisher');

// ── POST /ventas ── Registrar una venta ───────────────────────
const registrar = async (req, res) => {
  const { items } = req.body;
  // items: [{ producto_id, nombre_producto, cantidad, precio_unitario }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un producto' });
  }

  for (const item of items) {
    if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
      return res.status(400).json({ error: 'Cada item debe tener producto_id y cantidad mayor a 0' });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const montoTotal = items.reduce(
      (sum, i) => sum + (i.cantidad * (i.precio_unitario || 0)), 0
    );

    // 1. Crear la venta
    const [ventaResult] = await conn.query(
      'INSERT INTO venta (usuario_id, monto_total) VALUES (?, ?)',
      [req.usuario.id, montoTotal]
    );
    const ventaId = ventaResult.insertId;

    // 2. Insertar detalles
    for (const item of items) {
      const subtotal = item.cantidad * (item.precio_unitario || 0);
      await conn.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, item.producto_id, item.nombre_producto || '', item.cantidad, item.precio_unitario || 0, subtotal]
      );
    }

    // 3. Crear registro en outbox (patrón Outbox para garantizar entrega)
    const payload = {
      ventaId,
      usuarioId: req.usuario.id,
      items: items.map(i => ({
        productoId: i.producto_id,
        cantidad: i.cantidad
      }))
    };

    await conn.query(
      'INSERT INTO evento_venta (venta_id, tipo, payload) VALUES (?, ?, ?)',
      [ventaId, 'venta_registrada', JSON.stringify(payload)]
    );

    await conn.commit();

    // 4. Publicar a RabbitMQ (best effort - el outbox como respaldo)
    const publicado = await publicarVenta(payload);
    if (publicado) {
      await pool.query(
        "UPDATE evento_venta SET estado = 'publicado', publicado_en = NOW() WHERE venta_id = ? AND tipo = 'venta_registrada'",
        [ventaId]
      );
    }

    res.status(201).json({
      mensaje: 'Venta registrada correctamente',
      ventaId,
      montoTotal
    });

  } catch (err) {
    await conn.rollback();
    console.error('[registrar venta]', err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  } finally {
    conn.release();
  }
};

// ── GET /ventas ── Historial de ventas ────────────────────────
const listar = async (req, res) => {
  const { fecha_inicio, fecha_fin, producto } = req.query;
  const page  = parseInt(req.query.page  || '1');
  const limit = parseInt(req.query.limit || '20');
  const offset = (page - 1) * limit;

  let where = 'WHERE v.estado = "confirmada"';
  const params = [];

  if (fecha_inicio) {
    where += ' AND DATE(v.fecha_hora) >= ?';
    params.push(fecha_inicio);
  }
  if (fecha_fin) {
    if (fecha_inicio && fecha_fin < fecha_inicio) {
      return res.status(400).json({ error: 'La fecha de inicio no puede ser mayor que la fecha de fin' });
    }
    where += ' AND DATE(v.fecha_hora) <= ?';
    params.push(fecha_fin);
  }
  if (producto) {
    where += ' AND dv.nombre_producto LIKE ?';
    params.push(`%${producto}%`);
  }

  try {
    const query = `
      SELECT v.id, v.fecha_hora, v.monto_total,
             dv.producto_id, dv.nombre_producto, dv.cantidad, dv.precio_unitario, dv.subtotal
      FROM venta v
      JOIN detalle_venta dv ON v.id = dv.venta_id
      ${where}
      ORDER BY v.fecha_hora DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [...params, limit, offset]);

    const [total] = await pool.query(
      `SELECT COUNT(DISTINCT v.id) AS total FROM venta v JOIN detalle_venta dv ON v.id = dv.venta_id ${where}`,
      params
    );

    res.json({
      datos: rows,
      paginacion: { pagina: page, limite: limit, total: total[0].total }
    });

  } catch (err) {
    console.error('[listar ventas]', err);
    res.status(500).json({ error: 'Error al consultar el historial' });
  }
};

// ── GET /ventas/resumen ── Datos para Dashboard ───────────────
const resumen = async (req, res) => {
  try {
    const [hoy] = await pool.query(`
      SELECT COUNT(DISTINCT v.id) AS transacciones, COALESCE(SUM(v.monto_total),0) AS total
      FROM venta v WHERE DATE(v.fecha_hora) = CURDATE() AND v.estado = 'confirmada'
    `);

    const [topProductos] = await pool.query(`
      SELECT dv.nombre_producto, SUM(dv.cantidad) AS total_vendido
      FROM detalle_venta dv
      JOIN venta v ON v.id = dv.venta_id
      WHERE DATE(v.fecha_hora) = CURDATE() AND v.estado = 'confirmada'
      GROUP BY dv.nombre_producto
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    const [semana] = await pool.query(`
      SELECT COUNT(DISTINCT v.id) AS transacciones, COALESCE(SUM(v.monto_total),0) AS total
      FROM venta v
      WHERE YEARWEEK(v.fecha_hora, 1) = YEARWEEK(CURDATE(), 1) AND v.estado = 'confirmada'
    `);

    res.json({
      hoy: hoy[0],
      semana: semana[0],
      topProductos
    });

  } catch (err) {
    console.error('[resumen ventas]', err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

module.exports = { registrar, listar, resumen };
