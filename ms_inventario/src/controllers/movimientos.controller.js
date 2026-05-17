const pool = require('../config/db');
const { validarNoNegativo } = require('../utils/nonNegative');

const registrarMovimiento = async (req, res) => {
  const { insumo_id, tipo_movimiento, cantidad, referencia_eventolote_id } = req.body;
  const usuario_id = req.usuario.id; // Obtenido del token por verificarToken

  if (!insumo_id || !tipo_movimiento) {
    return res.status(400).json({ error: 'insumo_id y tipo_movimiento son obligatorios' });
  }

  const errorCantidad = validarNoNegativo(cantidad, { permitirCero: false, nombreCampo: 'cantidad' });
  if (!errorCantidad.valido) {
    return res.status(400).json({ error: errorCantidad.error });
  }

  if (!['entrada', 'salida'].includes(tipo_movimiento)) {
    return res.status(400).json({ error: 'tipo_movimiento debe ser "entrada" o "salida"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (tipo_movimiento === 'salida') {
      const stock = await client.query(
        'SELECT stock_actual FROM insumo WHERE id = $1 FOR UPDATE',
        [insumo_id]
      );
      if (stock.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Insumo no encontrado' });
      }
      const stockActual = Number(stock.rows[0].stock_actual);
      if (stockActual - errorCantidad.valor < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Stock insuficiente. Disponible: ${stockActual}, solicitado: ${errorCantidad.valor}`,
        });
      }
    }

    // 1. Insertar el registro del movimiento
    await client.query(
      `INSERT INTO movimiento_inventario 
       (insumo_id, usuario_id, tipo_movimiento, cantidad, referencia_evento, lote_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [insumo_id, usuario_id, tipo_movimiento, errorCantidad.valor, 'Ajuste manual / Producción', referencia_eventolote_id || null]
    );

    // 2. Actualizar el stock_actual en la tabla insumo
    const operador = tipo_movimiento === 'entrada' ? '+' : '-';
    await client.query(
      `UPDATE insumo SET stock_actual = stock_actual ${operador} $1 WHERE id = $2`,
      [errorCantidad.valor, insumo_id]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Movimiento registrado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al registrar movimiento' });
  } finally {
    client.release();
  }
};

const listarHistorial = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, i.nombre as insumo_nombre 
       FROM movimiento_inventario m 
       JOIN insumo i ON m.insumo_id = i.id 
       ORDER BY m.fecha_hora DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

module.exports = { registrarMovimiento, listarHistorial };