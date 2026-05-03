const cron = require('node-cron');
const pool = require('../config/db');

/**
 * Cron job que se ejecuta cada día a las 6am.
 * Verifica lotes próximos a vencer y genera alertas automáticas.
 */
const iniciarJobVencimientos = () => {
  cron.schedule('0 6 * * *', async () => {
    console.log('[inventario] ⏰ Ejecutando verificación de lotes por vencer...');

    const diasAlerta = parseInt(process.env.DIAS_ALERTA_VENCIMIENTO || '5');

    try {
      // Lotes próximos a vencer (dentro de X días) con stock disponible
      const [lotesPorVencer] = await pool.query(
        `SELECT l.id, l.insumo_id, l.numero_lote, l.fecha_vencimiento
         FROM lote l
         WHERE l.bloqueado = 0
           AND l.cantidad_disponible > 0
           AND DATEDIFF(l.fecha_vencimiento, CURDATE()) BETWEEN 0 AND ?`,
        [diasAlerta]
      );

      for (const lote of lotesPorVencer) {
        // Verificar si ya existe alerta activa para este lote
        const [existe] = await pool.query(
          "SELECT id FROM alerta WHERE insumo_id = ? AND tipo = 'lote_por_vencer' AND resuelta = 0",
          [lote.insumo_id]
        );
        if (existe.length === 0) {
          await pool.query(
            "INSERT INTO alerta (insumo_id, tipo) VALUES (?, 'lote_por_vencer')",
            [lote.insumo_id]
          );
          console.log(`[inventario] ⚠ Alerta lote por vencer: ${lote.numero_lote} (insumo ${lote.insumo_id})`);
        }
      }

      // Bloquear lotes vencidos automáticamente
      await pool.query(
        "UPDATE lote SET bloqueado = 1 WHERE fecha_vencimiento < CURDATE() AND bloqueado = 0"
      );

      console.log(`[inventario] ✓ Verificación completada. ${lotesPorVencer.length} lotes próximos a vencer.`);

    } catch (err) {
      console.error('[inventario] Error en job de vencimientos:', err.message);
    }
  }, {
    timezone: 'America/Bogota'
  });

  console.log('[ms_inventario] ✓ Job de verificación de vencimientos activo (6am diario)');
};

module.exports = { iniciarJobVencimientos };
