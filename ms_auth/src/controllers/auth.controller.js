const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

// ── Helpers ───────────────────────────────────────────────────

const generarTokens = (usuario) => {
  const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });

  const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

  return { accessToken, refreshTokenRaw, refreshTokenHash };
};

// ── POST /auth/login ──────────────────────────────────────────

const login = async (req, res) => {
  const { correo, contrasena } = req.body;

  // Validación de tipos y longitud (previene payloads maliciosos)
  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }
  if (typeof correo !== 'string' || typeof contrasena !== 'string') {
    return res.status(400).json({ error: 'Formato de datos inválido' });
  }
  if (correo.length > 254 || contrasena.length > 128) {
    return res.status(400).json({ error: 'Datos demasiado largos' });
  }
  // Validación básica de formato de correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo)) {
    return res.status(400).json({ error: 'Formato de correo inválido' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM usuario WHERE correo = $1 LIMIT 1', [correo]
    );
    const usuario = result.rows[0];

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { accessToken, refreshTokenRaw, refreshTokenHash } = generarTokens(usuario);

    const expira = new Date();
    expira.setDate(expira.getDate() + parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7'));

    await pool.query(
      'INSERT INTO refresh_token (usuario_id, token_hash, expira_en) VALUES ($1, $2, $3)',
      [usuario.id, refreshTokenHash, expira]
    );

    await pool.query(
      'DELETE FROM refresh_token WHERE usuario_id = $1 AND expira_en < NOW()',
      [usuario.id]
    );

    res.json({
      accessToken,
      refreshToken: refreshTokenRaw,
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }
    });

  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /auth/refresh ────────────────────────────────────────

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' });

  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const result = await pool.query(
      `SELECT rt.*, u.correo, u.rol, u.activo
       FROM refresh_token rt
       JOIN usuario u ON rt.usuario_id = u.id
       WHERE rt.token_hash = $1 AND rt.invalidado = false AND rt.expira_en > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    const registro = result.rows[0];
    if (!registro || !registro.activo) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const nuevoAccess = jwt.sign(
      { id: registro.usuario_id, correo: registro.correo, rol: registro.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken: nuevoAccess });

  } catch (err) {
    console.error('[refresh]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /auth/logout ─────────────────────────────────────────

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' });

  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      'UPDATE refresh_token SET invalidado = true WHERE token_hash = $1',
      [tokenHash]
    );
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('[logout]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── GET /auth/me ──────────────────────────────────────────────

const me = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, correo, rol, activo, creado_en FROM usuario WHERE id = $1',
      [req.usuario.id]
    );
    const usuario = result.rows[0];
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /auth/cambiar-contrasena ─────────────────────────────

const cambiarContrasena = async (req, res) => {
  const { contrasenaActual, contrasenaNueva } = req.body;

  if (!contrasenaActual || !contrasenaNueva) {
    return res.status(400).json({ error: 'contrasenaActual y contrasenaNueva son obligatorios' });
  }
  if (typeof contrasenaActual !== 'string' || typeof contrasenaNueva !== 'string') {
    return res.status(400).json({ error: 'Formato de datos inválido' });
  }
  if (contrasenaNueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM usuario WHERE id = $1', [req.usuario.id]
    );
    const usuario = result.rows[0];
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(contrasenaActual, usuario.contrasena_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hash = await bcrypt.hash(contrasenaNueva, 12);
    await pool.query(
      'UPDATE usuario SET contrasena_hash = $1 WHERE id = $2',
      [hash, usuario.id]
    );

    await pool.query(
      'UPDATE refresh_token SET invalidado = true WHERE usuario_id = $1',
      [usuario.id]
    );

    res.json({ mensaje: 'Contraseña actualizada correctamente. Inicia sesión de nuevo.' });

  } catch (err) {
    console.error('[cambiarContrasena]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { login, refresh, logout, me, cambiarContrasena };