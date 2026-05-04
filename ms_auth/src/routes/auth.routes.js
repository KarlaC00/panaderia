const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { login, refresh, logout, me, cambiarContrasena } = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');

// ── Rate limiter: 10 intentos por IP cada 15 minutos ──────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.'
  },
  keyGenerator: ipKeyGenerator   // ← helper oficial, maneja IPv4 e IPv6
});

// Rutas públicas
router.post('/login',   loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout',  logout);

// Rutas protegidas (requieren token válido)
router.get('/me',                   verificarToken, me);
router.post('/cambiar-contrasena',  verificarToken, cambiarContrasena);

module.exports = router;