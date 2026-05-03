const router = require('express').Router();
const { registrar, listar, resumen } = require('../controllers/ventas.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Todas las rutas requieren token
router.use(verificarToken);

router.post('/',        registrar);  // Empleado y Admin
router.get('/',         listar);     // Empleado y Admin
router.get('/resumen',  resumen);    // Para el Dashboard

module.exports = router;
