const pool = require('../config/db');

// ── GET /lotes ── Listar lotes con estado ─────────────────────
const listar = async (req, res) => {
  try {
    const diasAlerta = parseInt(process.env.DIAS_ALERTA_VENCIMIENTO || '5');

    const [rows] = await pool.query(
      `SELECT l.id, i.nombre AS insumo, l.numero_lote, l.cantidad_inicial,
              l.cantidad_disponible, l.fecha_ingreso, l.fecha_vencimiento,
              l.bloqueado,
              DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_para_vencer,
              CASE
                WHEN l.fecha_vencimiento < CURDATE() THEN 'vencido'
                WHEN DATEDIFF(l.fecha_vencimiento, CURDATE()) <= ? THEN 'por_vencer'
                ELSE 'vigente'
              END AS estado
       FROM lote l
       JOIN insumo i ON i.id = l.insumo_id
       WHERE l.cantidad_disponible > 0
       ORDER BY l.fecha_ingreso ASC`,
      [diasAlerta]
    );
    res.json(rows);
  } catch (err) {
    console.error('[listar lotes]', err);
    res.status(500).json({ error: 'Error al obtener lotes' });
  }
};

// ── POST /lotes ── Registrar ingreso de lote ──────────────────
const registrar = async (req, res) => {
  const { insumo_id, numero_lote, cantidad, fecha_vencimiento } = req.body;

  if (!insumo_id || !numero_lote || !cantidad || !fecha_vencimiento)
    return res.status(400).json({ error: 'insumo_id, numero_lote, cantidad y fecha_vencimiento son obligatorios' });

  if (new Date(fecha_vencimiento) < new Date())
    return res.status(400).json({ error: 'La fecha de vencimiento debe ser futura' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO lote (insumo_id, numero_lote, cantidad_inicial, cantidad_disponible, fecha_vencimiento)
       VALUES (?, ?, ?, ?, ?)`,
      [insumo_id, numero_lote, cantidad, cantidad, fecha_vencimiento]
    );

    // Actualizar stock_actual del insumo
    await conn.query(
      `UPDATE insumo SET stock_actual = (
        SELECT COALESCE(SUM(cantidad_disponible), 0) FROM lote WHERE insumo_id = ?
       ) WHERE id = ?`,
      [insumo_id, insumo_id]
    );

    // Registrar movimiento de entrada
    await conn.query(
      `INSERT INTO movimiento_inventario (insumo_id, usuario_id, tipo, cantidad)
       VALUES (?, ?, 'entrada', ?)`,
      [insumo_id, req.usuario.id, cantidad]
    );

    await conn.commit();
    res.status(201).json({ mensaje: 'Lote registrado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('[registrar lote]', err);
    res.status(500).json({ error: 'Error al registrar lote' });
  } finally {
    conn.release();
  }
};

module.exports = { listar, registrar };
