const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const recetas = await pool.query(
      `SELECT r.id AS receta_id, r.producto_id, p.nombre AS producto_nombre,
              ri.insumo_id, i.nombre AS insumo_nombre,
              ri.cantidad_requerida, i.unidad_medida
       FROM receta r
       JOIN producto p ON p.id = r.producto_id
       JOIN receta_insumo ri ON ri.receta_id = r.id
       JOIN insumo i ON i.id = ri.insumo_id
       WHERE r.activa = true
       ORDER BY p.nombre, i.nombre`
    );

    const mapa = {};

    for (const row of recetas.rows) {
      if (!mapa[row.producto_id]) {
        mapa[row.producto_id] = {
          receta_id: row.receta_id,
          producto_id: row.producto_id,
          producto_nombre: row.producto_nombre,
          insumos: []
        };
      }

      mapa[row.producto_id].insumos.push({
        insumo_id: row.insumo_id,
        nombre: row.insumo_nombre,
        cantidad_requerida: row.cantidad_requerida,
        unidad_medida: row.unidad_medida
      });
    }

    res.json(Object.values(mapa));

  } catch (err) {
    console.error('[listar recetas]', err);

    res.status(500).json({
      error: 'Error al listar recetas'
    });
  }
};

const obtener = async (req, res) => {
  const { productoId } = req.params;

  try {
    const recetas = await pool.query(
      `SELECT id
       FROM receta
       WHERE producto_id = $1
       AND activa = true
       LIMIT 1`,
      [productoId]
    );

    if (recetas.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Este producto no tiene receta configurada'
      });
    }

    const insumos = await pool.query(
      `SELECT i.id AS insumo_id,
              i.nombre,
              ri.cantidad_requerida,
              i.unidad_medida
       FROM receta_insumo ri
       JOIN insumo i ON i.id = ri.insumo_id
       WHERE ri.receta_id = $1`,
      [recetas.rows[0].id]
    );

    res.json({
      productoId,
      recetaId: recetas.rows[0].id,
      insumos: insumos.rows
    });

  } catch (err) {
    console.error('[obtener receta]', err);

    res.status(500).json({
      error: 'Error al obtener receta'
    });
  }
};

const crear = async (req, res) => {
  const { producto_id, insumos } = req.body;

  if (!producto_id || !insumos || insumos.length === 0) {
    return res.status(400).json({
      error: 'producto_id e insumos son obligatorios'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // verificar si ya existe receta
    const recetaExistente = await client.query(
      `SELECT id
       FROM receta
       WHERE producto_id = $1`,
      [producto_id]
    );

    if (recetaExistente.rows.length > 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        error: 'Este producto ya tiene una receta'
      });
    }

    const recetaResult = await client.query(
      `INSERT INTO receta (producto_id)
       VALUES ($1)
       RETURNING id`,
      [producto_id]
    );

    const recetaId = recetaResult.rows[0].id;

    for (const ins of insumos) {
      const existe = await client.query(
        `SELECT id
         FROM insumo
         WHERE id = $1
         AND activo = true`,
        [ins.insumo_id]
      );

      if (existe.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          error: `Insumo ${ins.insumo_id} no existe en el catálogo`
        });
      }

      await client.query(
        `INSERT INTO receta_insumo
         (receta_id, insumo_id, cantidad_requerida)
         VALUES ($1, $2, $3)`,
        [recetaId, ins.insumo_id, ins.cantidad_requerida]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Receta creada correctamente',
      recetaId
    });

  } catch (err) {
    await client.query('ROLLBACK');

    console.error('[crear receta]', err);

    res.status(500).json({
      error: 'Error al crear receta'
    });

  } finally {
    client.release();
  }
};

const actualizar = async (req, res) => {
  const { productoId } = req.params;
  const { insumos } = req.body;

  if (!insumos || insumos.length === 0) {
    return res.status(400).json({
      error: 'Se requiere al menos un insumo'
    });
  }

  const existe = await pool.query(
    `SELECT id
     FROM receta
     WHERE producto_id = $1
     AND activa = true
     LIMIT 1`,
    [productoId]
  );

  if (existe.rows.length === 0) {
    return res.status(404).json({
      error: 'No existe receta activa para este producto'
    });
  }

  const recetaId = existe.rows[0].id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // eliminar insumos anteriores
    await client.query(
      `DELETE FROM receta_insumo
       WHERE receta_id = $1`,
      [recetaId]
    );

    // insertar nuevos insumos
    for (const ins of insumos) {
      const insumoExiste = await client.query(
        `SELECT id
         FROM insumo
         WHERE id = $1
         AND activo = true`,
        [ins.insumo_id]
      );

      if (insumoExiste.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          error: `Insumo ${ins.insumo_id} no existe en el catálogo`
        });
      }

      await client.query(
        `INSERT INTO receta_insumo
         (receta_id, insumo_id, cantidad_requerida)
         VALUES ($1, $2, $3)`,
        [recetaId, ins.insumo_id, ins.cantidad_requerida]
      );
    }

    await client.query('COMMIT');

    res.json({
      mensaje: 'Receta actualizada correctamente',
      recetaId
    });

  } catch (err) {
    await client.query('ROLLBACK');

    console.error('[actualizar receta]', err);

    res.status(500).json({
      error: 'Error al actualizar receta'
    });

  } finally {
    client.release();
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  actualizar
};