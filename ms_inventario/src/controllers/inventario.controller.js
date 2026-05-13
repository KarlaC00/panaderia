const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const { incluir_inactivos } = req.query;
    const filtroProducto = incluir_inactivos === 'true' ? '' : 'WHERE p.activo = true';
    const filtroInsumo   = incluir_inactivos === 'true' ? '' : 'WHERE activo = true';

    const productos = await pool.query(
      `SELECT p.id, p.nombre, p.unidad_medida, p.precio_unitario, p.stock_minimo, p.activo,
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
  const { nombre, unidad_medida, precio_unitario, stock_minimo } = req.body;
  if (!nombre || !unidad_medida)
    return res.status(400).json({ error: 'nombre y unidad_medida son obligatorios' });

  try {
    const result = await pool.query(
      `INSERT INTO producto (nombre, unidad_medida, precio_unitario, stock_minimo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre, unidad_medida, precio_unitario ?? null, stock_minimo ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[crearProducto]', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

const editarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, unidad_medida, precio_unitario, stock_minimo, activo } = req.body;

  try {
    const existe = await pool.query('SELECT id FROM producto WHERE id = $1', [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ error: 'Producto no encontrado' });

    const result = await pool.query(
      `UPDATE producto
       SET nombre          = COALESCE($1, nombre),
           unidad_medida   = COALESCE($2, unidad_medida),
           precio_unitario = COALESCE($3, precio_unitario),
           stock_minimo    = COALESCE($4, stock_minimo),
           activo          = COALESCE($5, activo)
       WHERE id = $6
       RETURNING *`,
      [nombre, unidad_medida, precio_unitario, stock_minimo, activo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[editarProducto]', err);
    res.status(500).json({ error: 'Error al editar producto' });
  }
};

const crearInsumo = async (req, res) => {
  const { nombre, unidad_medida, stock_minimo } = req.body;
  if (!nombre || !unidad_medida)
    return res.status(400).json({ error: 'nombre y unidad_medida son obligatorios' });

  try {
    const result = await pool.query(
      `INSERT INTO insumo (nombre, unidad_medida, stock_minimo, stock_actual)
       VALUES ($1, $2, $3, 0) RETURNING *`,
      [nombre, unidad_medida, stock_minimo ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[crearInsumo]', err);
    res.status(500).json({ error: 'Error al crear insumo' });
  }
};

const editarInsumo = async (req, res) => {
  const { id } = req.params;
  const { nombre, unidad_medida, stock_minimo, activo } = req.body;

  try {
    const existe = await pool.query('SELECT id FROM insumo WHERE id = $1', [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ error: 'Insumo no encontrado' });

    const result = await pool.query(
      `UPDATE insumo
       SET nombre        = COALESCE($1, nombre),
           unidad_medida = COALESCE($2, unidad_medida),
           stock_minimo  = COALESCE($3, stock_minimo),
           activo        = COALESCE($4, activo)
       WHERE id = $5
       RETURNING *`,
      [nombre, unidad_medida, stock_minimo, activo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[editarInsumo]', err);
    res.status(500).json({ error: 'Error al editar insumo' });
  }
};

const eliminarInsumo = async (req, res) => {
  const { id } = req.params;
  try {
    const enUso = await pool.query(
      `SELECT ri.id FROM receta_insumo ri
       JOIN receta r ON r.id = ri.receta_id
       WHERE ri.insumo_id = $1 AND r.activa = true LIMIT 1`,
      [id]
    );
    if (enUso.rows.length > 0)
      return res.status(409).json({ error: 'No se puede eliminar: el insumo está en una receta activa' });

    await pool.query('UPDATE insumo SET activo = false WHERE id = $1', [id]);
    res.json({ mensaje: 'Insumo desactivado correctamente' });
  } catch (err) {
    console.error('[eliminarInsumo]', err);
    res.status(500).json({ error: 'Error al eliminar insumo' });
  }
};

const actualizarStockMinimo = async (req, res) => {
  const { id } = req.params;
  const { tipo, stock_minimo } = req.body;
  if (!tipo || stock_minimo == null)
    return res.status(400).json({ error: 'tipo y stock_minimo son obligatorios' });

  const tabla = tipo === 'producto' ? 'producto' : 'insumo';
  try {
    const existe = await pool.query(`SELECT id FROM ${tabla} WHERE id = $1`, [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ error: `${tipo} no encontrado` });

    await pool.query(`UPDATE ${tabla} SET stock_minimo = $1 WHERE id = $2`, [stock_minimo, id]);
    res.json({ mensaje: 'Stock mínimo actualizado' });
  } catch (err) {
    console.error('[actualizarStockMinimo]', err);
    res.status(500).json({ error: 'Error al actualizar stock mínimo' });
  }
};

const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { tipo, activo } = req.body;
  if (typeof activo !== 'boolean' || !tipo)
    return res.status(400).json({ error: 'tipo y activo (boolean) son obligatorios' });

  const tabla = tipo === 'producto' ? 'producto' : 'insumo';
  try {
    const existe = await pool.query(`SELECT id FROM ${tabla} WHERE id = $1`, [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ error: `${tipo} no encontrado` });

    if (activo === false) {
      const queryCheck = tipo === 'insumo'
        ? `SELECT ri.id FROM receta_insumo ri JOIN receta r ON r.id = ri.receta_id WHERE ri.insumo_id = $1 AND r.activa = true LIMIT 1`
        : `SELECT id FROM receta WHERE producto_id = $1 AND activa = true LIMIT 1`;
      const enUso = await pool.query(queryCheck, [id]);
      if (enUso.rows.length > 0)
        return res.status(409).json({ error: `No se puede desactivar: el ${tipo} está en una receta activa` });
    }

    await pool.query(`UPDATE ${tabla} SET activo = $1 WHERE id = $2`, [activo, id]);
    res.json({ mensaje: `${tipo} ${activo ? 'activado' : 'desactivado'} correctamente` });
  } catch (err) {
    console.error('[cambiarEstado]', err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

const eliminarProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const existe = await pool.query('SELECT id, activo FROM producto WHERE id = $1', [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ error: 'Producto no encontrado' });

    const enUso = await pool.query(
      `SELECT id FROM receta WHERE producto_id = $1 AND activa = true LIMIT 1`,
      [id]
    );
    if (enUso.rows.length > 0)
      return res.status(409).json({ error: 'No se puede desactivar: el producto está en una receta activa' });

    const nuevoEstado = !existe.rows[0].activo;
    await pool.query('UPDATE producto SET activo = $1 WHERE id = $2', [nuevoEstado, id]);
    res.json({ mensaje: `Producto ${nuevoEstado ? 'activado' : 'desactivado'} correctamente` });
  } catch (err) {
    console.error('[eliminarProducto]', err);
    res.status(500).json({ error: 'Error al cambiar estado del producto' });
  }
};

module.exports = {
  listar,
  crearProducto,
  editarProducto,
  eliminarProducto,
  crearInsumo,
  editarInsumo,
  eliminarInsumo,
  actualizarStockMinimo,
  cambiarEstado,
};