const router = require('express').Router();
const { listar, crear, actualizar, eliminar } = require('../controllers/user.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Todas las rutas de usuarios requieren token válido + rol administrador
router.use(verificarToken, soloAdmin);

router.get('/',       listar);
router.post('/',      crear);
router.put('/:id',    actualizar);
router.delete('/:id', eliminar);

module.exports = router;
