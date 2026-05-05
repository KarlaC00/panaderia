// routes/ventas.routes.js
// Cubre: REQ-V07 (GET /ventas), REQ-V01 (POST /ventas), REQ-D02/D03 (GET /ventas/resumen)

const router = require('express').Router();
const { registrar, listar, resumen } = require('../controllers/ventas.controller');
const { verificarToken, soloAdmin }  = require('../middleware/auth');

// Todas las rutas requieren JWT válido (REQ-A04, MX-E01-2026 escenario 4)
router.use(verificarToken);

// IMPORTANTE: /resumen antes de / para que Express no lo confunda con un parámetro dinámico
router.get('/resumen', resumen);   // Empleado y Admin – Dashboard (REQ-D02, REQ-D03)
router.post('/',       registrar); // Empleado y Admin – Registrar venta (REQ-V01…V06)
router.get('/',        listar);    // Empleado y Admin – Historial (REQ-V07…V10)

module.exports = router;