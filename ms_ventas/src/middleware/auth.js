// middleware/auth.js
// Sin cambios de lógica respecto a la versión original.
// Cubre: REQ-A02, REQ-A04, MX-E01-2026 (escenario 4 – acceso bloqueado sin JWT válido)

const jwt = require('jsonwebtoken');

/**
 * Verifica que la petición lleve un JWT válido en el header Authorization.
 * Rechaza con 401 si falta o está expirado/inválido.
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    // Unifica "inválido" y "expirado" en un único mensaje (REQ-A02 – no revelar detalle)
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Permite el acceso solo a usuarios con rol 'administrador'.
 * Debe usarse después de verificarToken.
 * Cubre REQ-A04 / RN-06.
 */
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol Administrador' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin };