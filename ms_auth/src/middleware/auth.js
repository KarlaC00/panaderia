const jwt = require('jsonwebtoken');

/**
 * Verifica que el request lleve un token JWT válido.
 * Agrega req.usuario = { id, correo, rol }
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Solo permite pasar a usuarios con rol 'administrador'.
 * Usar DESPUÉS de verificarToken.
 */
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol Administrador' });
  }
  next();
};

/**
 * Solo permite pasar a usuarios con rol 'empleado'.
 * Usar DESPUÉS de verificarToken.
 */
const soloEmpleado = (req, res, next) => {
  if (req.usuario?.rol !== 'empleado') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol Empleado' });
  }
  next();
};

/**
 * Permite pasar a usuarios con cualquiera de los roles indicados.
 * Uso: verificarRol('administrador', 'empleado')
 * Usar DESPUÉS de verificarToken.
 *
 * @param {...string} roles - Roles permitidos
 */
const verificarRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario?.rol)) {
    return res.status(403).json({
      error: `Acceso denegado: se requiere uno de los roles [${roles.join(', ')}]`
    });
  }
  next();
};

module.exports = { verificarToken, soloAdmin, soloEmpleado, verificarRol };