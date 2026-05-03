const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 5432, // El puerto por defecto de Postgres es 5432
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Configuraciones de optimización (Similares a tu pool anterior)
  max: 10,                      // Equivalente a connectionLimit
  idleTimeoutMillis: 30000,     // Tiempo para cerrar conexiones inactivas
  connectionTimeoutMillis: 2000 // Tiempo máximo para intentar conectar
});

// Verificación de conexión (Ideal para debug en consola)
pool.on('connect', () => {
  console.log(`✅ Base de datos [${process.env.DB_NAME}] conectada en puerto ${process.env.DB_PORT || 5432}`);
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;