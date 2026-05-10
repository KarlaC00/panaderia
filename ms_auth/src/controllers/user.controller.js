const bcrypt = require('bcrypt');
const pool = require('../config/db');

// ── GET /usuarios ─────────────────────────────────────────────
const listar = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, correo, rol, activo, creado_en FROM usuario ORDER BY creado_en DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[listar usuarios]', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ── GET /usuarios/:id ─────────────────────────────────────────
const obtener = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, nombre, correo, rol, activo, creado_en FROM usuario WHERE id = $1',
            [id]
        );
        const usuario = result.rows[0];
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(usuario);
    } catch (err) {
        console.error('[obtener usuario]', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ── POST /usuarios ────────────────────────────────────────────
const crear = async (req, res) => {
    const { nombre, correo, contrasena } = req.body;
    let { rol } = req.body;

    // Detectamos si la petición viene de la ruta pública de admin o de la protegida
    // Si viene de /registro-admin, forzamos el rol a 'administrador'
    const esRutaAdminPublica = req.baseUrl + req.path === '/usuarios/registro-admin';

    if (esRutaAdminPublica) {
        rol = 'administrador';
    } else {
        // Si no es la ruta pública, el middleware 'verificarToken' ya validó que quien pide esto es Admin.
        // Aquí permitimos que el Admin decida el rol, o forzamos a 'empleado' según tu preferencia.
        if (!rol) rol = 'empleado'; 
    }

    if (!nombre || !correo || !contrasena || !rol) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!['administrador', 'empleado'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
    }

    try {
        const existe = await pool.query('SELECT id FROM usuario WHERE correo = $1', [correo]);
        if (existe.rows.length > 0) {
            return res.status(409).json({ error: 'El correo ya está registrado' });
        }

        const hash = await bcrypt.hash(contrasena, 12);
        await pool.query(
            'INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES ($1, $2, $3, $4)',
            [nombre, correo, hash, rol]
        );

        res.status(201).json({ mensaje: `Usuario (${rol}) creado correctamente` });

    } catch (err) {
        console.error('[crear usuario]', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ── PUT /usuarios/:id ─────────────────────────────────────────
const actualizar = async (req, res) => {
    const { id } = req.params;
    const { nombre, rol } = req.body;

    try {
        const campos = [];
        const valores = [];
        let i = 1;

        if (nombre !== undefined) {
            campos.push(`nombre = $${i++}`);
            valores.push(nombre);
        }
        if (rol !== undefined) {
            if (!['administrador', 'empleado'].includes(rol))
                return res.status(400).json({ error: 'Rol inválido' });
            campos.push(`rol = $${i++}`);
            valores.push(rol);
        }

        if (campos.length === 0)
            return res.status(400).json({ error: 'Nada que actualizar' });

        valores.push(id);
        await pool.query(
            `UPDATE usuario SET ${campos.join(', ')} WHERE id = $${i}`,
            valores
        );

        res.json({ mensaje: 'Usuario actualizado correctamente' });

    } catch (err) {
        console.error('[actualizar usuario]', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ── PATCH /usuarios/:id/desactivar ────────────────────────────
const desactivar = async (req, res) => {
    const { id } = req.params;
    try {
        const existe = await pool.query('SELECT id, activo FROM usuario WHERE id = $1', [id]);
        if (existe.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        if (!existe.rows[0].activo)
            return res.status(409).json({ error: 'El usuario ya está inactivo' });

        await pool.query('UPDATE usuario SET activo = false WHERE id = $1', [id]);

        await pool.query(
            'UPDATE refresh_token SET invalidado = true WHERE usuario_id = $1',
            [id]
        );

        res.json({ mensaje: 'Usuario desactivado y sesiones cerradas correctamente' });

    } catch (err) {
        console.error('[desactivar usuario]', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ── PATCH /usuarios/:id/activar ───────────────────────────────
const activar = async (req, res) => {
    const { id } = req.params;
    try {
        const existe = await pool.query('SELECT id, activo FROM usuario WHERE id = $1', [id]);
        if (existe.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        if (existe.rows[0].activo)
            return res.status(409).json({ error: 'El usuario ya está activo' });

        await pool.query('UPDATE usuario SET activo = true WHERE id = $1', [id]);

        res.json({ mensaje: 'Usuario activado correctamente' });

    } catch (err) {
        console.error('[activar usuario]', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ── DELETE /usuarios/:id/sesiones ─────────────────────────────
const cerrarSesiones = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE refresh_token SET invalidado = true WHERE usuario_id = $1 AND invalidado = false',
            [id]
        );
        res.json({
            mensaje: 'Sesiones cerradas correctamente',
            sesiones_cerradas: result.rowCount
        });
    } catch (err) {
        console.error('[cerrarSesiones]', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { listar, obtener, crear, actualizar, desactivar, activar, cerrarSesiones };