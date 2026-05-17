const pool = require('../config/db');
const { publicarVenta } = require('../events/publisher');
const { validarNoNegativo } = require('../utils/nonNegative');

const INVENTARIO_API_URL = process.env.INVENTARIO_API_URL || 'http://localhost:3003';

async function obtenerCatalogoProductos(authorization) {
  const headers = { Accept: 'application/json' };
  if (authorization) headers.Authorization = authorization;

  const res = await fetch(`${INVENTARIO_API_URL}/inventario?incluir_inactivos=true`, { headers });
  if (!res.ok) {
    const err = new Error('No se pudo consultar el catálogo de inventario');
    err.status = 503;
    throw err;
  }

  const data = await res.json();
  return new Map(
    (data.productos || []).map((p) => [String(p.id), p])
  );
}

/**
 * Resuelve precios desde ms_inventario (API). Ignora precio_unitario del cliente.
 */
async function resolverItemsConPrecioCatalogo(items, authorization) {
  let catalogo;
  try {
    catalogo = await obtenerCatalogoProductos(authorization);
  } catch (err) {
    return { error: err.message, status: err.status || 503 };
  }
  const itemsResueltos = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const errorCantidad = validarNoNegativo(item.cantidad, {
      permitirCero: false,
      nombreCampo: `items[${i}].cantidad`,
    });
    if (!errorCantidad.valido) {
      return { error: errorCantidad.error, status: 400 };
    }

    const productoId = item.producto_id;
    if (!productoId || typeof productoId !== 'string' || productoId.trim() === '') {
      return { error: `items[${i}].producto_id no es válido`, status: 400 };
    }

    const producto = catalogo.get(String(productoId));
    if (!producto) {
      return { error: `Producto ${productoId} no existe en el catálogo`, status: 404 };
    }
    if (producto.activo === false) {
      return { error: `El producto "${producto.nombre}" no está activo`, status: 400 };
    }
    if (producto.precio_unitario == null) {
      return {
        error: `El producto "${producto.nombre}" no tiene precio configurado`,
        status: 400,
      };
    }

    const precioUnitario = Number(producto.precio_unitario);
    const errorPrecio = validarNoNegativo(precioUnitario, { nombreCampo: 'precio_unitario' });
    if (!errorPrecio.valido) {
      return { error: errorPrecio.error, status: 400 };
    }

    const cantidad = errorCantidad.valor;
    itemsResueltos.push({
      producto_id: productoId,
      nombre_producto: producto.nombre,
      cantidad,
      precio_unitario: precioUnitario,
      subtotal: cantidad * precioUnitario,
    });
  }

  return { items: itemsResueltos };
}

// ── POST /ventas ── Registrar una venta ───────────────────────
const registrar = async (req, res) => {
  console.log('[registrar] body recibido:', JSON.stringify(req.body)); // 👈 agrega esto
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un producto' });
  }

  const resolucion = await resolverItemsConPrecioCatalogo(items, req.headers.authorization);
  if (resolucion.error) {
    return res.status(resolucion.status).json({ error: resolucion.error });
  }

  const itemsConPrecio = resolucion.items;
  const montoTotal = itemsConPrecio.reduce((sum, i) => sum + i.subtotal, 0);

  const errorMonto = validarNoNegativo(montoTotal, { nombreCampo: 'monto_total' });
  if (!errorMonto.valido) {
    return res.status(400).json({ error: errorMonto.error });
  }

  // En Postgres se usa pool.connect() para transacciones
  const conn = await pool.connect(); 

  try {
    await conn.query('BEGIN'); // Iniciar transacción

    // 1. Crear la venta (Postgres usa $1, $2 y RETURNING id)
    const ventaQuery = 'INSERT INTO venta (usuario_id, monto_total) VALUES ($1, $2) RETURNING id';
    const ventaResult = await conn.query(ventaQuery, [req.usuario.id, montoTotal]);
    const ventaId = ventaResult.rows[0].id;

    // 2. Insertar detalles (precio tomado del catálogo)
    for (const item of itemsConPrecio) {
      const detalleQuery = `
        INSERT INTO detalle_venta (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await conn.query(detalleQuery, [
        ventaId,
        item.producto_id,
        item.nombre_producto,
        item.cantidad,
        item.precio_unitario,
        item.subtotal,
      ]);
    }

    // 3. Registro en outbox para RabbitMQ
    const payload = {
      ventaId,
      usuarioId: req.usuario.id,
      items: itemsConPrecio.map((i) => ({ productoId: i.producto_id, cantidad: i.cantidad })),
    };

    await conn.query(
      'INSERT INTO evento_venta (venta_id, tipo, payload) VALUES ($1, $2, $3)',
      [ventaId, 'venta_registrada', JSON.stringify(payload)]
    );

    await conn.query('COMMIT'); // Confirmar cambios

    // 4. Publicar a RabbitMQ
    const publicado = await publicarVenta(payload);
    if (publicado) {
      await pool.query(
        "UPDATE evento_venta SET estado = 'publicado', publicado_en = NOW() WHERE venta_id = $1 AND tipo = 'venta_registrada'",
        [ventaId]
      );
    }

    res.status(201).json({
      mensaje: 'Venta registrada correctamente',
      ventaId,
      montoTotal,
      items: itemsConPrecio.map((i) => ({
        producto_id: i.producto_id,
        nombre_producto: i.nombre_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
      })),
    });

  } catch (err) {
    await conn.query('ROLLBACK'); // Deshacer en caso de error
    console.error('[registrar venta]', err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  } finally {
    // IMPORTANTE: Liberar la conexión para que el pool no se llene
    conn.release(); 
  }
};

// ── GET /ventas ── Historial de ventas ────────────────────────
const listar = async (req, res) => {
  const { fecha_inicio, fecha_fin, producto } = req.query;

const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
const offset = (page - 1) * limit;

  let where = 'WHERE 1=1'; 
  const params = [];
  let paramIdx = 1;

  if (fecha_inicio) {
    where += ` AND v.fecha_hora::date >= $${paramIdx++}`;
    params.push(fecha_inicio);
  }
  if (fecha_fin) {
    where += ` AND v.fecha_hora::date <= $${paramIdx++}`;
    params.push(fecha_fin);
  }
  if (producto) {
    where += ` AND dv.nombre_producto ILIKE $${paramIdx++}`;
    params.push(`%${producto}%`);
  }

  try {
    const query = `
      SELECT v.id, v.fecha_hora, v.monto_total, v.estado,
             dv.producto_id, dv.nombre_producto, dv.cantidad, dv.precio_unitario, dv.subtotal
      FROM venta v
      LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
      ${where}
      ORDER BY v.fecha_hora DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    
    // Postgres devuelve un objeto con la propiedad .rows
    const result = await pool.query(query, [...params, limit, offset]);

    const totalQuery = `SELECT COUNT(DISTINCT v.id) AS total FROM venta v LEFT JOIN detalle_venta dv ON v.id = dv.venta_id ${where}`;
    const totalResult = await pool.query(totalQuery, params);

    res.json({
      datos: result.rows,
      paginacion: { 
        pagina: page, 
        limite: limit, 
        total: parseInt(totalResult.rows[0]?.total || 0) 
      }
    });

  } catch (err) {
    console.error('[listar ventas]', err);
    res.status(500).json({ error: 'Error al consultar el historial' });
  }
};

// ── GET /ventas/resumen ── Datos para Dashboard ───────────────
const resumen = async (req, res) => {
  try {
    // Queries para Postgres (quitando filtros de estado conflictivos)
    const hoyRes = await pool.query(`
      SELECT COUNT(DISTINCT v.id) AS transacciones, COALESCE(SUM(v.monto_total),0) AS total
      FROM venta v WHERE v.fecha_hora::date = CURRENT_DATE
    `);

    const topRes = await pool.query(`
      SELECT dv.nombre_producto, SUM(dv.cantidad) AS total_vendido
      FROM detalle_venta dv
      JOIN venta v ON v.id = dv.venta_id
      WHERE v.fecha_hora::date = CURRENT_DATE
      GROUP BY dv.nombre_producto
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    const semanaRes = await pool.query(`
      SELECT COUNT(DISTINCT v.id) AS transacciones, COALESCE(SUM(v.monto_total),0) AS total
      FROM venta v
      WHERE v.fecha_hora >= date_trunc('week', CURRENT_DATE)
    `);

    res.json({
      hoy: hoyRes.rows[0],
      semana: semanaRes.rows[0],
      topProductos: topRes.rows
    });

  } catch (err) {
    console.error('[resumen ventas]', err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

module.exports = { registrar, listar, resumen };