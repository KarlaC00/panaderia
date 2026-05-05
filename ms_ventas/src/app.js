// app.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./config/db');
const { conectar: conectarRabbitMQ } = require('./events/publisher');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/ventas', require('./routes/ventas.routes'));

app.get('/health', (_req, res) =>
  res.json({ servicio: 'ms_ventas', estado: 'ok' })
);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = process.env.PORT || 3002;

app.listen(PORT, async () => {
  try {
    // Verificar conexión a PostgreSQL al arrancar
    await pool.query('SELECT 1');
    console.log(`[ms_ventas] ✓ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[ms_ventas] ✓ Conectado a PostgreSQL - base de datos: ${process.env.DB_NAME}`);
  } catch (err) {
    console.error('[ms_ventas] ✗ Error PostgreSQL:', err.message);
    process.exit(1);
  }
  await conectarRabbitMQ();
});