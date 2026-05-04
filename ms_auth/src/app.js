require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────────────
app.use('/auth',     require('./routes/auth.routes'));
app.use('/usuarios', require('./routes/user.routes'));

// ── Health check ───────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ servicio: 'ms_auth', estado: 'ok' }));

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ── Limpieza de refresh tokens expirados ───────────────────────
const limpiarTokensExpirados = async () => {
  try {
    const result = await pool.query(
      'DELETE FROM refresh_token WHERE expira_en < NOW()'
    );
    if (result.rowCount > 0) {
      console.log(`[ms_auth] ✓ Tokens expirados eliminados: ${result.rowCount}`);
    }
  } catch (err) {
    console.error('[ms_auth] ✗ Error al limpiar tokens expirados:', err.message);
  }
};

// ── Iniciar servidor ───────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`[ms_auth] ✓ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[ms_auth] ✓ Conectado a PostgreSQL - base de datos: ${process.env.DB_NAME}`);

    // Limpieza inmediata al iniciar
    await limpiarTokensExpirados();

    // Limpieza programada cada hora
    setInterval(limpiarTokensExpirados, 60 * 60 * 1000);

  } catch (err) {
    console.error('[ms_auth] ✗ Error al conectar con PostgreSQL:', err.message);
    process.exit(1);
  }
});