const pool = require('../config/db');

// ── GET /recetas/:productoId ───────────────────────────────────
const obtener = async (req, res) => {
  const { productoId } = req.params;
  try {
    const [recetas] = await pool.query(
      'SELECT id FROM receta WHERE producto_id = ? AND activa = 1 LIMIT 1',
      [productoId]
    );
    if (recetas.length === 0)
      return res.status(404).json({ mensaje: 'Este producto no tiene receta configurada' });

    const [insumos] = await pool.query(
      `SELECT i.nombre, ri.cantidad_requerida, i.unidad_medida
       FROM receta_insumo ri
       JOIN insumo i ON i.id = ri.insumo_id
       WHERE ri.receta_id = ?`,
      [recetas[0].id]
    );

    res.json({ productoId, recetaId: recetas[0].id, insumos });
  } catch (err) {
    console.error('[obtener receta]', err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
};

// ── POST /recetas ─────────────────────────────────────────────
const crear = async (req, res) => {
  const { producto_id, insumos } = req.body;
  // insumos: [{ insumo_id, cantidad_requerida }]

  if (!producto_id || !insumos || insumos.length === 0)
    return res.status(400).json({ error: 'producto_id e insumos son obligatorios' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Desactivar receta anterior si existe
    await conn.query(
      'UPDATE receta SET activa = 0 WHERE producto_id = ?',
      [producto_id]
    );

    const [recetaResult] = await conn.query(
      'INSERT INTO receta (producto_id) VALUES (?)',
      [producto_id]
    );
    const recetaId = recetaResult.insertId;

    for (const ins of insumos) {
      // Validar que el insumo exista
      const [existe] = await conn.query('SELECT id FROM insumo WHERE id = ? AND activo = 1', [ins.insumo_id]);
      if (existe.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: `Insumo ${ins.insumo_id} no existe en el catálogo` });
      }
      await conn.query(
        'INSERT INTO receta_insumo (receta_id, insumo_id, cantidad_requerida) VALUES (?, ?, ?)',
        [recetaId, ins.insumo_id, ins.cantidad_requerida]
      );
    }

    await conn.commit();
    res.status(201).json({ mensaje: 'Receta creada correctamente', recetaId });
  } catch (err) {
    await conn.rollback();
    console.error('[crear receta]', err);
    res.status(500).json({ error: 'Error al crear receta' });
  } finally {
    conn.release();
  }
};

module.exports = { obtener, crear };
