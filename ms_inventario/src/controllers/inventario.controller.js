const pool = require('../config/db');

// Listar productos e insumos con stock estimado
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

// Crear definición de producto
const crearProducto = async (req, res) => {
  // ... sin cambios, déjalo igual
};

const crearInsumo = async (req, res) => {
  // ... sin cambios, déjalo igual
};

const eliminarInsumo = async (req, res) => {
  // ... sin cambios, déjalo igual (lo mantienes por compatibilidad)
};

const actualizarStockMinimo = async (req, res) => {
  // ... sin cambios, déjalo igual
};

// Cambiar estado (Activo/Inactivo)
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

    // Validaciones antes de desactivar
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
    console.error('[cambiar estado]', err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

module.exports = {
  listar,
  crearProducto,
  crearInsumo,
  eliminarProducto,
  eliminarInsumo,
  actualizarStockMinimo,
  cambiarEstado  
};