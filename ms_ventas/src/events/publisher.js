// events/publisher.js
// Sin cambios de lógica respecto a la versión original.
// RabbitMQ es agnóstico a la base de datos del servicio.
// Cubre: REQ-E01, REQ-E03, REQ-E04

const amqp = require('amqplib');

let channel = null;

const conectar = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await conn.createChannel();
    await channel.assertQueue(
      process.env.RABBITMQ_QUEUE || 'venta_registrada',
      { durable: true }           // sobrevive reinicios de RabbitMQ (REQ-E03)
    );
    console.log('[ms_ventas] ✓ Conectado a RabbitMQ');

    // REQ-E04: reconexión automática ante desconexión
    conn.on('close', () => {
      console.warn('[ms_ventas] RabbitMQ desconectado. Reintentando en 5s…');
      channel = null;
      setTimeout(conectar, 5000);
    });
  } catch (err) {
    console.error('[ms_ventas] Error RabbitMQ:', err.message, '- Reintentando en 5s…');
    setTimeout(conectar, 5000);
  }
};

/**
 * Publica el evento 'venta_registrada' en la cola.
 * Retorna true si fue publicado, false si no hay canal disponible.
 * En ese caso el worker del Outbox lo publicará en el próximo ciclo.
 *
 * @param {object} payload - Datos de la venta
 * @returns {Promise<boolean>}
 */
const publicarVenta = async (payload) => {
  if (!channel) {
    console.warn('[ms_ventas] Sin canal RabbitMQ. Evento quedará en Outbox:', payload.ventaId);
    return false;
  }
  const mensaje = Buffer.from(JSON.stringify(payload));
  channel.sendToQueue(
    process.env.RABBITMQ_QUEUE || 'venta_registrada',
    mensaje,
    { persistent: true }          // mensaje durable (REQ-E03)
  );
  return true;
};

module.exports = { conectar, publicarVenta };