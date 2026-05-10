const router = require('express').Router();
const { listar, obtener, crear, actualizar, desactivar, activar, cerrarSesiones } = require('../controllers/user.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// 1. RUTA PÚBLICA: Crear administrador (No requiere token)
// Se usa para el primer setup del sistema.
router.post('/registro-admin', crear);

// 2. RUTAS PROTEGIDAS: Requieren token y rol administrador
// Todas las rutas debajo de este middleware están protegidas.
router.use(verificarToken, soloAdmin);

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', crear); // Este POST ahora es solo para crear Empleados (por el middleware)
router.put('/:id', actualizar);
router.patch('/:id/desactivar', desactivar);
router.patch('/:id/activar', activar);
router.delete('/:id/sesiones', cerrarSesiones);

module.exports = router;