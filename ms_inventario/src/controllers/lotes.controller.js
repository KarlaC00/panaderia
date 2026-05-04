const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const diasAlerta = parseInt(process.env.DIAS_ALERTA_VENCIMIENTO || '5');

    const result = await pool.query(
      `SELECT l.id, i.nombre AS insumo, l.numero_lote, l.cantidad_inicial,
              l.cantidad_disponible, l.fecha_ingreso, l.fecha_vencimiento,
              l.bloqueado,
              (l.fecha_vencimiento::date - CURRENT_DATE) AS dias_para_vencer,
              CASE
                WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
                WHEN (l.fecha_vencimiento::date - CURRENT_DATE) <= $1 THEN 'por_vencer'
                ELSE 'vigente'
              END AS estado
       FROM lote l
       JOIN insumo i ON i.id = l.insumo_id
       WHERE l.cantidad_disponible > 0
       ORDER BY l.fecha_ingreso ASC`,
      [diasAlerta]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[listar lotes]', err);
    res.status(500).json({ error: 'Error al obtener lotes' });
  }
};

const registrar = async (req, res) => {
  const { insumo_id, numero_lote, cantidad, fecha_vencimiento } = req.body;

  if (!insumo_id || !numero_lote || !cantidad || !fecha_vencimiento)
    return res.status(400).json({ error: 'insumo_id, numero_lote, cantidad y fecha_vencimiento son obligatorios' });

  if (new Date(fecha_vencimiento) < new Date())
    return res.status(400).json({ error: 'La fecha de vencimiento debe ser futura' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO lote (insumo_id, numero_lote, cantidad_inicial, cantidad_disponible, fecha_vencimiento)
       VALUES ($1, $2, $3, $3, $4)`,
      [insumo_id, numero_lote, cantidad, fecha_vencimiento]
    );

    await client.query(
      `UPDATE insumo SET stock_actual = (
        SELECT COALESCE(SUM(cantidad_disponible), 0) FROM lote WHERE insumo_id = $1
       ) WHERE id = $1`,
      [insumo_id]
    );

    await client.query(
      `INSERT INTO movimiento_inventario (insumo_id, usuario_id, tipo, cantidad)
       VALUES ($1, $2, 'entrada', $3)`,
      [insumo_id, req.usuario.id, cantidad]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Lote registrado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[registrar lote]', err);
    res.status(500).json({ error: 'Error al registrar lote' });
  } finally {
    client.release();
  }
};

module.exports = { listar, registrar };