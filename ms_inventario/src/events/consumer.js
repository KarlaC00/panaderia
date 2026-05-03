const amqp = require('amqplib');
const pool = require('../config/db');

/**
 * Descuenta insumos según la receta BOM del producto vendido.
 * Aplica política FIFO (lote más antiguo con stock disponible primero).
 */
const procesarVentaRegistrada = async (payload) => {
  const { ventaId, usuarioId, items } = payload;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of items) {
      const { productoId, cantidad } = item;

      // 1. Obtener la receta activa del producto
      const [recetas] = await conn.query(
        'SELECT id FROM receta WHERE producto_id = ? AND activa = 1 LIMIT 1',
        [productoId]
      );

      if (recetas.length === 0) {
        console.warn(`[inventario] Producto ${productoId} sin receta activa. Se omite descuento.`);
        continue;
      }

      const recetaId = recetas[0].id;

      // 2. Obtener insumos de la receta
      const [insumosReceta] = await conn.query(
        'SELECT insumo_id, cantidad_requerida FROM receta_insumo WHERE receta_id = ?',
        [recetaId]
      );

      for (const ri of insumosReceta) {
        const cantidadNecesaria = ri.cantidad_requerida * cantidad;

        // 3. Obtener lotes FIFO (más antiguo primero) con stock disponible y no vencidos
        const [lotes] = await conn.query(
          `SELECT id, cantidad_disponible FROM lote
           WHERE insumo_id = ? AND cantidad_disponible > 0 AND bloqueado = 0
             AND fecha_vencimiento >= CURDATE()
           ORDER BY fecha_ingreso ASC`,
          [ri.insumo_id]
        );

        let pendiente = cantidadNecesaria;

        for (const lote of lotes) {
          if (pendiente <= 0) break;

          const descuento = Math.min(lote.cantidad_disponible, pendiente);
          pendiente -= descuento;

          await conn.query(
            'UPDATE lote SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?',
            [descuento, lote.id]
          );

          // Registrar movimiento (auditoría inmutable)
          await conn.query(
            `INSERT INTO movimiento_inventario (insumo_id, lote_id, usuario_id, tipo, cantidad, referencia_evento)
             VALUES (?, ?, ?, 'salida', ?, ?)`,
            [ri.insumo_id, lote.id, usuarioId, descuento, `venta_${ventaId}`]
          );
        }

        if (pendiente > 0) {
          console.error(`[inventario] Stock insuficiente para insumo ${ri.insumo_id}. Faltan ${pendiente} unidades.`);
          // Registrar en log pero no revertir (consistencia eventual)
        }

        // 4. Actualizar stock_actual del insumo
        await conn.query(
          `UPDATE insumo SET stock_actual = (
            SELECT COALESCE(SUM(cantidad_disponible), 0) FROM lote WHERE insumo_id = ?
          ) WHERE id = ?`,
          [ri.insumo_id, ri.insumo_id]
        );

        // 5. Verificar si se generó alerta de stock bajo
        const [insumo] = await conn.query(
          'SELECT stock_actual, stock_minimo FROM insumo WHERE id = ?',
          [ri.insumo_id]
        );

        if (insumo[0] && insumo[0].stock_actual <= insumo[0].stock_minimo) {
          // Verificar si ya existe alerta activa para no duplicar
          const [alertaExistente] = await conn.query(
            "SELECT id FROM alerta WHERE insumo_id = ? AND tipo = 'stock_bajo' AND resuelta = 0 LIMIT 1",
            [ri.insumo_id]
          );
          if (alertaExistente.length === 0) {
            await conn.query(
              "INSERT INTO alerta (insumo_id, tipo, stock_al_momento) VALUES (?, 'stock_bajo', ?)",
              [ri.insumo_id, insumo[0].stock_actual]
            );
            console.log(`[inventario] ⚠ Alerta stock bajo generada para insumo ${ri.insumo_id}`);
          }
        }
      }
    }

    await conn.commit();
    console.log(`[inventario] ✓ Evento venta_registrada procesado - ventaId: ${ventaId}`);

  } catch (err) {
    await conn.rollback();
    console.error('[inventario] Error procesando evento:', err.message);
    throw err; // Re-throw para que RabbitMQ reencole
  } finally {
    conn.release();
  }
};

// ── Iniciar consumidor de RabbitMQ ───────────────────────────

const iniciarConsumidor = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await conn.createChannel();
    const queue = process.env.RABBITMQ_QUEUE || 'venta_registrada';

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1); // Procesar de a 1 mensaje a la vez

    console.log(`[ms_inventario] ✓ Escuchando cola RabbitMQ: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        await procesarVentaRegistrada(payload);
        channel.ack(msg); // Confirmar procesamiento exitoso
      } catch (err) {
        console.error('[inventario] Error procesando mensaje:', err.message);
        // nack con requeue=true para que RabbitMQ reencole
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
