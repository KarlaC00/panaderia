const router = require('express').Router();
const { verificarToken, soloAdmin } = require('../middleware/auth');
const inv = require('../controllers/inventario.controller');
const rec = require('../controllers/recetas.controller');
const lot = require('../controllers/lotes.controller');
const ale = require('../controllers/alertas.controller');

router.use(verificarToken);

// ── Inventario ──────────────────────────────────────────────────
router.get('/inventario',                                inv.listar);
router.post('/inventario/productos',     soloAdmin,      inv.crearProducto);
router.post('/inventario/insumos',       soloAdmin,      inv.crearInsumo);
router.delete('/inventario/insumos/:id', soloAdmin,      inv.eliminarInsumo);
router.patch('/inventario/:id/stock-minimo', soloAdmin,  inv.actualizarStockMinimo);
router.patch('/inventario/:id/estado',   soloAdmin,      inv.cambiarEstado);

// ── Recetas ─────────────────────────────────────────────────────
router.get('/recetas/:productoId',       rec.obtener);
router.post('/recetas',      soloAdmin,  rec.crear);

// ── Lotes ───────────────────────────────────────────────────────
router.get('/lotes',                     lot.listar);
router.post('/lotes',                    lot.registrar); // ← admin y empleado

// ── Alertas ─────────────────────────────────────────────────────
router.get('/alertas',                   ale.listarActivas);
router.get('/alertas/historial',         ale.historial);

module.exports = router;