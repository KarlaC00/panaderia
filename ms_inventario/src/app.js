require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { iniciarConsumidor } = require('./events/consumer');
const { iniciarJobVencimientos } = require('./jobs/vencimientos.job');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', require('./routes/index.routes'));
app.get('/health', (req, res) => res.json({ servicio: 'ms_inventario', estado: 'ok' }));
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = process.env.PORT || 3003;
app.listen(PORT, async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`[ms_inventario] ✓ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[ms_inventario] ✓ Conectado a MySQL - base de datos: ${process.env.DB_NAME}`);
  } catch (err) {
    console.error('[ms_inventario] ✗ Error MySQL:', err.message);
    process.exit(1);
  }

  await iniciarConsumidor();
  iniciarJobVencimientos();
});
