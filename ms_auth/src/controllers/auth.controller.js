const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────

const generarTokens = (usuario) => {
  const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });

  // Refresh token: string aleatorio de 64 bytes
  const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

  return { accessToken, refreshTokenRaw, refreshTokenHash };
};

// ── POST /auth/login ──────────────────────────────────────────

const login = async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM usuario WHERE correo = ? LIMIT 1', [correo]
    );

    const usuario = rows[0];

    // Mismo mensaje genérico para correo incorrecto o contraseña incorrecta (seguridad)
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { accessToken, refreshTokenRaw, refreshTokenHash } = generarTokens(usuario);

    // Guardar refresh token en BD
    const expira = new Date();
    expira.setDate(expira.getDate() + parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7'));

    await pool.query(
      'INSERT INTO refresh_token (usuario_id, token_hash, expira_en) VALUES (?, ?, ?)',
      [usuario.id, refreshTokenHash, expira]
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

    const [rows] = await pool.query(
      `SELECT rt.*, u.correo, u.rol, u.activo
       FROM refresh_token rt
       JOIN usuario u ON rt.usuario_id = u.id
       WHERE rt.token_hash = ? AND rt.invalidado = 0 AND rt.expira_en > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    const registro = rows[0];
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
      'UPDATE refresh_token SET invalidado = 1 WHERE token_hash = ?',
      [tokenHash]
    );
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('[logout]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { login, refresh, logout };
