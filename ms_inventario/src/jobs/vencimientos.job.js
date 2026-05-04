const cron = require('node-cron');
const pool = require('../config/db');

const iniciarJobVencimientos = () => {
  cron.schedule('0 6 * * *', async () => {
    console.log('[inventario] Ejecutando verificación de lotes por vencer...');

    const diasAlerta = parseInt(process.env.DIAS_ALERTA_VENCIMIENTO || '5');

    try {
      const lotesPorVencer = await pool.query(
        `SELECT l.id, l.insumo_id, l.numero_lote, l.fecha_vencimiento
         FROM lote l
         WHERE l.bloqueado = false
           AND l.cantidad_disponible > 0
           AND (l.fecha_vencimiento::date - CURRENT_DATE) BETWEEN 0 AND $1`,
        [diasAlerta]
      );

      for (const lote of lotesPorVencer.rows) {
        const existe = await pool.query(
          `SELECT id FROM alerta
           WHERE insumo_id = $1 AND tipo = 'lote_por_vencer' AND resuelta = false`,
          [lote.insumo_id]
        );
        if (existe.rows.length === 0) {
          await pool.query(
            `INSERT INTO alerta (insumo_id, tipo) VALUES ($1, 'lote_por_vencer')`,
            [lote.insumo_id]
          );
          console.log(`[inventario] ⚠ Alerta lote por vencer: ${lote.numero_lote} (insumo ${lote.insumo_id})`);
        }
      }

      await pool.query(
        `UPDATE lote SET bloqueado = true
         WHERE fecha_vencimiento < CURRENT_DATE AND bloqueado = false`
      );

      console.log(`[inventario] ✓ Verificación completada. ${lotesPorVencer.rows.length} lotes próximos a vencer.`);
    } catch (err) {
      console.error('[inventario] Error en job de vencimientos:', err.message);
    }
  }, {
    timezone: 'America/Bogota'
  });

  console.log('[ms_inventario] ✓ Job de verificación de vencimientos activo (6am diario)');
};

module.exports = { iniciarJobVencimientos };