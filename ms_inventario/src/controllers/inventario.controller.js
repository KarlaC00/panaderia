const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const { incluir_inactivos } = req.query;

    const filtroProducto = incluir_inactivos === 'true' ? '' : 'WHERE p.activo = true';
    const filtroInsumo = incluir_inactivos === 'true' ? '' : 'WHERE activo = true';

    const productos = await pool.query(
      `SELECT p.id, p.nombre, p.unidad_medida, p.stock_minimo, p.activo,
              COALESCE(
                (SELECT MIN(FLOOR(
                          (SELECT COALESCE(SUM(l.cantidad_disponible), 0)
                           FROM lote l
                           WHERE l.insumo_id = ri.insumo_id
                             AND l.cantidad_disponible > 0
                             AND l.bloqueado = false
                             AND l.fecha_vencimiento >= CURRENT_DATE
                          ) / NULLIF(ri.cantidad_requerida, 0)
                       ))
                 FROM receta_insumo ri
                 JOIN receta r ON r.id = ri.receta_id
                 WHERE r.producto_id = p.id
                   AND r.activa = true),
              0) AS stock_estimado,
              EXISTS(
                SELECT 1 FROM receta WHERE producto_id = p.id AND activa = true
              ) AS tiene_receta
       FROM producto p
       ${filtroProducto}
       ORDER BY p.activo DESC, p.nombre`
    );

    const insumos = await pool.query(
      `SELECT id, nombre, unidad_medida, stock_actual, stock_minimo, activo
       FROM insumo
       ${filtroInsumo}
       ORDER BY activo DESC, nombre`
    );

    res.json({ productos: productos.rows, insumos: insumos.rows });
  } catch (err) {
    console.error('[listar inventario]', err);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

const crearProducto = async (req, res) => {
  const { nombre, unidad_medida, stock_minimo } = req.body;

  if (!nombre || !unidad_medida)
    return res.status(400).json({ error: 'nombre y unidad_medida son obligatorios' });

  try {
    const existe = await pool.query(
      `SELECT id FROM producto WHERE LOWER(nombre) = LOWER($1)`, [nombre]
    );
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Ya existe un producto con ese nombre' });

    const result = await pool.query(
      `INSERT INTO producto (nombre, unidad_medida, stock_minimo)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, unidad_medida, stock_minimo, activo`,
      [nombre, unidad_medida, stock_minimo ?? 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[crearProducto]', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

const crearInsumo = async (req, res) => {
  const { nombre, unidad_medida, stock_minimo } = req.body;

  if (!nombre || !unidad_medida)
    return res.status(400).json({ error: 'nombre y unidad_medida son obligatorios' });

  try {
    const existe = await pool.query(
      `SELECT id FROM insumo WHERE LOWER(nombre) = LOWER($1)`, [nombre]
    );
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Ya existe un insumo con ese nombre' });

    const result = await pool.query(
      `INSERT INTO insumo (nombre, unidad_medida, stock_minimo, stock_actual)
       VALUES ($1, $2, $3, 0)
       RETURNING id, nombre, unidad_medida, stock_minimo, stock_actual, activo`,
      [nombre, unidad_medida, stock_minimo ?? 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[crearInsumo]', err);
    res.status(500).json({ error: 'Error al crear insumo' });
  }
};

const eliminarInsumo = async (req, res) => {
  const { id } = req.params;

  try {
    const enUso = await pool.query(
      `SELECT ri.id FROM receta_insumo ri
       JOIN receta r ON r.id = ri.receta_id
       WHERE ri.insumo_id = $1 AND r.activa = true
       LIMIT 1`,
      [id]
    );
    if (enUso.rows.length > 0)
      return res.status(409).json({ error: 'No se puede eliminar: el insumo está en uso en una receta activa' });

    const conLotes = await pool.query(
      `SELECT id FROM lote WHERE insumo_id = $1 AND cantidad_disponible > 0 LIMIT 1`, [id]
    );
    if (conLotes.rows.length > 0)
      return res.status(409).json({ error: 'No se puede eliminar: el insumo tiene stock disponible en lotes' });

    const result = await pool.query(`DELETE FROM insumo WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Insumo no encontrado' });

    res.json({ mensaje: 'Insumo eliminado correctamente' });
  } catch (err) {
    console.error('[eliminarInsumo]', err);
    res.status(500).json({ error: 'Error al eliminar insumo' });
  }
};

const actualizarStockMinimo = async (req, res) => {
  const { id } = req.params;
  const { tipo, stock_minimo } = req.body;

  if (stock_minimo === undefined || !tipo)
    return res.status(400).json({ error: 'tipo y stock_minimo son obligatorios' });

  if (!['producto', 'insumo'].includes(tipo))
    return res.status(400).json({ error: 'tipo debe ser producto o insumo' });

  if (typeof stock_minimo !== 'number' || stock_minimo < 0)
    return res.status(400).json({ error: 'stock_minimo debe ser un número mayor o igual a 0' });

  const tabla = tipo === 'producto' ? 'producto' : 'insumo';

  try {
    const result = await pool.query(
      `UPDATE ${tabla} SET stock_minimo = $1 WHERE id = $2 RETURNING id, nombre, stock_minimo`,
      [stock_minimo, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: `${tipo} no encontrado` });

    res.json({ mensaje: 'Stock mínimo actualizado', ...result.rows[0] });
  } catch (err) {
    console.error('[actualizarStockMinimo]', err);
    res.status(500).json({ error: 'Error al actualizar stock mínimo' });
  }
};

// ── NUEVA FUNCIÓN ──────────────────────────────────────────────
const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { tipo, activo } = req.body;

  if (typeof activo !== 'boolean' || !tipo)
    return res.status(400).json({ error: 'tipo y activo (boolean) son obligatorios' });

  if (!['producto', 'insumo'].includes(tipo))
    return res.status(400).json({ error: 'tipo debe ser producto o insumo' });

  const tabla = tipo === 'producto' ? 'producto' : 'insumo';

  try {
    const existe = await pool.query(
      `SELECT id, activo FROM ${tabla} WHERE id = $1`, [id]
    );
    if (existe.rows.length === 0)
      return res.status(404).json({ error: `${tipo} no encontrado` });

    if (activo === false && tipo === 'insumo') {
      const enUso = await pool.query(
        `SELECT ri.id FROM receta_insumo ri
         JOIN receta r ON r.id = ri.receta_id
         WHERE ri.insumo_id = $1 AND r.activa = true
         LIMIT 1`,
        [id]
      );
      if (enUso.rows.length > 0)
        return res.status(409).json({
          error: 'No se puede desactivar: el insumo está en uso en una receta activa'
        });
    }

    if (activo === false && tipo === 'producto') {
      const conReceta = await pool.query(
        `SELECT id FROM receta WHERE producto_id = $1 AND activa = true LIMIT 1`,
        [id]
      );
      if (conReceta.rows.length > 0)
        return res.status(409).json({
          error: 'No se puede desactivar: el producto tiene una receta activa'
        });
    }

    await pool.query(
      `UPDATE ${tabla} SET activo = $1 WHERE id = $2`,
      [activo, id]
    );

    res.json({
      mensaje: `${tipo} ${activo ? 'activado' : 'desactivado'} correctamente`
    });
  } catch (err) {
    console.error('[cambiar estado]', err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

module.exports = {
  listar,
  crearProducto,
  crearInsumo,
  eliminarInsumo,
  actualizarStockMinimo,
  cambiarEstado  
};