const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 5432, // Puerto estándar de Postgres
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Configuraciones de rendimiento
  max: 10,                      // Equivalente a connectionLimit
  idleTimeoutMillis: 30000,     // Cerrar conexiones inactivas tras 30s
  connectionTimeoutMillis: 2000 // Error si tarda más de 2s en conectar
});

// Verificación de conexión para tu consola
pool.on('connect', () => {
  console.log(`✅ [DB] Conectado a la base de datos: ${process.env.DB_NAME}`);
});

pool.on('error', (err) => {
  console.error('❌ [DB] Error inesperado en el pool de Postgres', err);
});

module.exports = pool;npm install pg