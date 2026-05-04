const amqp = require('amqplib');
const pool = require('../config/db');

const procesarVentaRegistrada = async (payload) => {
  const { ventaId, usuarioId, items } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      const { productoId, cantidad } = item;

      const recetas = await client.query(
        'SELECT id FROM receta WHERE producto_id = $1 AND activa = true LIMIT 1',
        [productoId]
      );

      if (recetas.rows.length === 0) {
        console.warn(`[inventario] Producto ${productoId} sin receta activa. Se omite descuento.`);
        continue;
      }

      const recetaId = recetas.rows[0].id;

      const insumosReceta = await client.query(
        'SELECT insumo_id, cantidad_requerida FROM receta_insumo WHERE receta_id = $1',
        [recetaId]
      );

      for (const ri of insumosReceta.rows) {
        const cantidadNecesaria = ri.cantidad_requerida * cantidad;

        const lotes = await client.query(
          `SELECT id, cantidad_disponible FROM lote
           WHERE insumo_id = $1
             AND cantidad_disponible > 0
             AND bloqueado = false
             AND fecha_vencimiento >= CURRENT_DATE
           ORDER BY fecha_ingreso ASC`,
          [ri.insumo_id]
        );

        let pendiente = cantidadNecesaria;

        for (const lote of lotes.rows) {
          if (pendiente <= 0) break;

          const descuento = Math.min(lote.cantidad_disponible, pendiente);
          pendiente -= descuento;

          await client.query(
            'UPDATE lote SET cantidad_disponible = cantidad_disponible - $1 WHERE id = $2',
            [descuento, lote.id]
          );

          await client.query(
            `INSERT INTO movimiento_inventario (insumo_id, lote_id, usuario_id, tipo, cantidad, referencia_evento)
             VALUES ($1, $2, $3, 'salida', $4, $5)`,
            [ri.insumo_id, lote.id, usuarioId, descuento, `venta_${ventaId}`]
          );
        }

        // ── Registrar incidente si no había stock suficiente ──
        if (pendiente > 0) {
          console.error(`[inventario] Stock insuficiente para insumo ${ri.insumo_id}. Faltan ${pendiente} unidades.`);
          await client.query(
            `INSERT INTO movimiento_inventario (insumo_id, lote_id, usuario_id, tipo, cantidad, referencia_evento)
             VALUES ($1, NULL, $2, 'error_stock_insuficiente', $3, $4)`,
            [ri.insumo_id, usuarioId, pendiente, `venta_${ventaId}`]
          );
        }

        await client.query(
          `UPDATE insumo SET stock_actual = (
            SELECT COALESCE(SUM(cantidad_disponible), 0) FROM lote WHERE insumo_id = $1
           ) WHERE id = $1`,
          [ri.insumo_id]
        );

        const insumo = await client.query(
          'SELECT stock_actual, stock_minimo FROM insumo WHERE id = $1',
          [ri.insumo_id]
        );

        if (insumo.rows[0] && insumo.rows[0].stock_actual <= insumo.rows[0].stock_minimo) {
          const alertaExistente = await client.query(
            `SELECT id FROM alerta
             WHERE insumo_id = $1 AND tipo = 'stock_bajo' AND resuelta = false
             LIMIT 1`,
            [ri.insumo_id]
          );
          if (alertaExistente.rows.length === 0) {
            await client.query(
              `INSERT INTO alerta (insumo_id, tipo, stock_al_momento)
               VALUES ($1, 'stock_bajo', $2)`,
              [ri.insumo_id, insumo.rows[0].stock_actual]
            );
            console.log(`[inventario] ⚠ Alerta stock bajo generada para insumo ${ri.insumo_id}`);
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`[inventario] ✓ Evento venta_registrada procesado - ventaId: ${ventaId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[inventario] Error procesando evento:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

const iniciarConsumidor = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await conn.createChannel();
    const queue = process.env.RABBITMQ_QUEUE || 'venta_registrada';

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    console.log(`[ms_inventario] ✓ Escuchando cola RabbitMQ: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await procesarVentaRegistrada(payload);
        channel.ack(msg);
      } catch (err) {
        console.error('[inventario] Error procesando mensaje:', err.message);
        channel.nack(msg, false, true);
      }
    });

    conn.on('close', () => {
      console.warn('[ms_inventario] RabbitMQ desconectado. Reintentando en 5s...');
      setTimeout(iniciarConsumidor, 5000);
    });
  } catch (err) {
    console.error('[ms_inventario] Error RabbitMQ:', err.message, '- Reintentando en 5s...');
    setTimeout(iniciarConsumidor, 5000);
  }
};

module.exports = { iniciarConsumidor };