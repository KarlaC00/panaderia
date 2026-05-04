const pool = require('../config/db');

const obtener = async (req, res) => {
  const { productoId } = req.params;
  try {
    const recetas = await pool.query(
      'SELECT id FROM receta WHERE producto_id = $1 AND activa = true LIMIT 1',
      [productoId]
    );
    if (recetas.rows.length === 0)
      return res.status(404).json({ mensaje: 'Este producto no tiene receta configurada' });

    const insumos = await pool.query(
      `SELECT i.nombre, ri.cantidad_requerida, i.unidad_medida
       FROM receta_insumo ri
       JOIN insumo i ON i.id = ri.insumo_id
       WHERE ri.receta_id = $1`,
      [recetas.rows[0].id]
    );

    res.json({ productoId, recetaId: recetas.rows[0].id, insumos: insumos.rows });
  } catch (err) {
    console.error('[obtener receta]', err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
};

const crear = async (req, res) => {
  const { producto_id, insumos } = req.body;

  if (!producto_id || !insumos || insumos.length === 0)
    return res.status(400).json({ error: 'producto_id e insumos son obligatorios' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE receta SET activa = false WHERE producto_id = $1',
      [producto_id]
    );

    const recetaResult = await client.query(
      'INSERT INTO receta (producto_id) VALUES ($1) RETURNING id',
      [producto_id]
    );
    const recetaId = recetaResult.rows[0].id;

    for (const ins of insumos) {
      const existe = await client.query(
        'SELECT id FROM insumo WHERE id = $1 AND activo = true',
        [ins.insumo_id]
      );
      if (existe.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insumo ${ins.insumo_id} no existe en el catálogo` });
      }
      await client.query(
        'INSERT INTO receta_insumo (receta_id, insumo_id, cantidad_requerida) VALUES ($1, $2, $3)',
        [recetaId, ins.insumo_id, ins.cantidad_requerida]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Receta creada correctamente', recetaId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[crear receta]', err);
    res.status(500).json({ error: 'Error al crear receta' });
  } finally {
    client.release();
  }
};

module.exports = { obtener, crear };