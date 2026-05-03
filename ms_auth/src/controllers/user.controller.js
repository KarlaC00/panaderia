const bcrypt = require('bcrypt');
const pool = require('../config/db');

// ── GET /usuarios ─────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, rol, activo, creado_en FROM usuario ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[listar usuarios]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /usuarios ────────────────────────────────────────────
const crear = async (req, res) => {
  const { nombre, correo, contrasena, rol } = req.body;

  if (!nombre || !correo || !contrasena || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (!['administrador', 'empleado'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Use administrador o empleado' });
  }

  try {
    // Verificar correo único
    const [existe] = await pool.query('SELECT id FROM usuario WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const hash = await bcrypt.hash(contrasena, 12);
    await pool.query(
      'INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, hash, rol]
    );

    res.status(201).json({ mensaje: 'Usuario creado correctamente' });

  } catch (err) {
    console.error('[crear usuario]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── PUT /usuarios/:id ──────────────────────────────────────────
const actualizar = async (req, res) => {
  const { id } = req.params;
  const { rol, activo } = req.body;

  try {
    const campos = [];
    const valores = [];

    if (rol !== undefined) {
      if (!['administrador', 'empleado'].includes(rol))
        return res.status(400).json({ error: 'Rol inválido' });
      campos.push('rol = ?');
      valores.push(rol);
    }
    if (activo !== undefined) {
      campos.push('activo = ?');
      valores.push(activo ? 1 : 0);
    }

    if (campos.length === 0)
      return res.status(400).json({ error: 'Nada que actualizar' });

    valores.push(id);
    await pool.query(`UPDATE usuario SET ${campos.join(', ')} WHERE id = ?`, valores);

    res.json({ mensaje: 'Usuario actualizado correctamente' });

  } catch (err) {
    console.error('[actualizar usuario]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── DELETE /usuarios/:id ───────────────────────────────────────
const eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    // ON DELETE CASCADE elimina refresh_tokens automáticamente
    await pool.query('DELETE FROM usuario WHERE id = ?', [id]);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('[eliminar usuario]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { listar, crear, actualizar, eliminar };
