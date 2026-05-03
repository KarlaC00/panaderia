const amqp = require('amqplib');

let channel = null;

const conectar = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await conn.createChannel();
    await channel.assertQueue(process.env.RABBITMQ_QUEUE || 'venta_registrada', { durable: true });
    console.log('[ms_ventas] ✓ Conectado a RabbitMQ');

    conn.on('close', () => {
      console.warn('[ms_ventas] RabbitMQ desconectado. Reintentando en 5s...');
      channel = null;
      setTimeout(conectar, 5000);
    });
  } catch (err) {
    console.error('[ms_ventas] Error RabbitMQ:', err.message, '- Reintentando en 5s...');
    setTimeout(conectar, 5000);
  }
};

/**
 * Publica el evento 'venta_registrada' en la cola.
 * @param {object} payload - Datos de la venta
 */
const publicarVenta = async (payload) => {
  if (!channel) {
    console.warn('[ms_ventas] Sin canal RabbitMQ. Evento no publicado:', payload.ventaId);
    return false;
  }
  const mensaje = Buffer.from(JSON.stringify(payload));
  channel.sendToQueue(
    process.env.RABBITMQ_QUEUE || 'venta_registrada',
    mensaje,
    { persistent: true } // sobrevive reinicios de RabbitMQ
  );
  return true;
};

module.exports = { conectar, publicarVenta };
