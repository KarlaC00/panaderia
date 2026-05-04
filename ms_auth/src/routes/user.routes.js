const router = require('express').Router();
const { listar, obtener, crear, actualizar, desactivar, activar, cerrarSesiones } = require('../controllers/user.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Todas las rutas de usuarios requieren token válido + rol administrador
router.use(verificarToken, soloAdmin);

router.get('/',                       listar);
router.get('/:id',                    obtener);
router.post('/',                      crear);
router.put('/:id',                    actualizar);
router.patch('/:id/desactivar',       desactivar);
router.patch('/:id/activar',          activar);
router.delete('/:id/sesiones',        cerrarSesiones);

module.exports = router;