const pool = require('../config/db');

const listarActivas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.tipo, a.stock_al_momento, a.generada_en,
              i.nombre AS insumo, p.nombre AS producto
       FROM alerta a
       LEFT JOIN insumo  i ON i.id = a.insumo_id
       LEFT JOIN producto p ON p.id = a.producto_id
       WHERE a.resuelta = false
       ORDER BY a.generada_en DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[listar alertas]', err);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
};

const historial = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.tipo, a.stock_al_momento, a.generada_en, a.resuelta_en, a.resuelta,
              i.nombre AS insumo, p.nombre AS producto
       FROM alerta a
       LEFT JOIN insumo  i ON i.id = a.insumo_id
       LEFT JOIN producto p ON p.id = a.producto_id
       ORDER BY a.generada_en DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[historial alertas]', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

const resolver = async (req, res) => {
  const { id } = req.params;
  try {
    const existe = await pool.query('SELECT id FROM alerta WHERE id = $1', [id]);
    if (existe.rows.length === 0)
      return res.status(404).json({ error: 'Alerta no encontrada' });

    await pool.query(
      `UPDATE alerta SET resuelta = true, resuelta_en = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ mensaje: 'Alerta marcada como resuelta' });
  } catch (err) {
    console.error('[resolver alerta]', err);
    res.status(500).json({ error: 'Error al resolver alerta' });
  }
};

module.exports = { listarActivas, historial, resolver };