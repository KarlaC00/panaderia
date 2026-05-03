const pool = require('../config/db');

// ── GET /inventario ── Estado actual del stock ─────────────────
const listar = async (req, res) => {
  try {
    const [productos] = await pool.query(
      `SELECT p.id, p.nombre, p.unidad_medida, p.stock_minimo, p.activo,
              COALESCE(
                (SELECT SUM(l.cantidad_disponible) FROM lote l
                 JOIN receta_insumo ri ON ri.insumo_id = l.insumo_id
                 JOIN receta r ON r.id = ri.receta_id WHERE r.producto_id = p.id),
              0) AS stock_estimado
       FROM producto p WHERE p.activo = 1 ORDER BY p.nombre`
    );

    const [insumos] = await pool.query(
      'SELECT id, nombre, unidad_medida, stock_actual, stock_minimo FROM insumo WHERE activo = 1 ORDER BY nombre'
    );

    res.json({ productos, insumos });
  } catch (err) {
    console.error('[listar inventario]', err);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

// ── POST /inventario/productos ── Crear producto ──────────────
const crearProducto = async (req, res) => {
  const { nombre, unidad_medida, stock_minimo } = req.body;
  if (!nombre || !unidad_medida || stock_minimo === undefined)
    return res.status(400).json({ error: 'nombre, unidad_medida y stock_minimo son obligatorios' });

  try {
    await pool.query(
      'INSERT INTO producto (nombre, unidad_medida, stock_minimo) VALUES (?, ?, ?)',
      [nombre, unidad_medida, stock_minimo]
    );
    res.status(201).json({ mensaje: 'Producto creado correctamente' });
  } catch (err) {
    console.error('[crear producto]', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// ── POST /inventario/insumos ── Crear insumo ──────────────────
const crearInsumo = async (req, res) => {
  const { nombre, unidad_medida, stock_minimo } = req.body;
  if (!nombre || !unidad_medida || stock_minimo === undefined)
    return res.status(400).json({ error: 'nombre, unidad_medida y stock_minimo son obligatorios' });

  try {
    await pool.query(
      'INSERT INTO insumo (nombre, unidad_medida, stock_minimo) VALUES (?, ?, ?)',
      [nombre, unidad_medida, stock_minimo]
    );
    res.status(201).json({ mensaje: 'Insumo creado correctamente' });
  } catch (err) {
    console.error('[crear insumo]', err);
    res.status(500).json({ error: 'Error al crear insumo' });
  }
};

// ── DELETE /inventario/insumos/:id ────────────────────────────
const eliminarInsumo = async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar si está en alguna receta activa
    const [enUso] = await pool.query(
      `SELECT ri.id FROM receta_insumo ri
       JOIN receta r ON r.id = ri.receta_id
       WHERE ri.insumo_id = ? AND r.activa = 1 LIMIT 1`,
      [id]
    );
    if (enUso.length > 0)
      return res.status(409).json({ error: 'No se puede eliminar: el insumo está en uso en una receta activa' });

    await pool.query('UPDATE insumo SET activo = 0 WHERE id = ?', [id]);
    res.json({ mensaje: 'Insumo desactivado correctamente' });
  } catch (err) {
    console.error('[eliminar insumo]', err);
    res.status(500).json({ error: 'Error al eliminar insumo' });
  }
};

module.exports = { listar, crearProducto, crearInsumo, eliminarInsumo };
