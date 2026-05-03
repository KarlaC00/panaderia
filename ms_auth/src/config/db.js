const { Pool } = require('pg');
require('dotenv').config();

// En Postgres no se usa 'host', 'user', etc. dentro de un objeto mysql.createPool
// Se usa la clase Pool de la librería 'pg'
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 5432, // Puerto por defecto de Postgres
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,                 // Equivalente a connectionLimit
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000,
});

// Tip para Liderazgo: Verificar la conexión al arrancar ayuda a no debugear a ciegas
pool.on('connect', () => {
  console.log(`✅ [DB] Conectado exitosamente a ${process.env.DB_NAME}`);
});

pool.on('error', (err) => {
  console.error('❌ [DB] Error inesperado en el pool de Postgres', err);
});

module.exports = pool;