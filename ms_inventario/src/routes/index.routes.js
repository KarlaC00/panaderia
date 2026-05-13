const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const inv = require('../controllers/inventario.controller');
const alertas = require('../controllers/alertas.controller');
const lotes = require('../controllers/lotes.controller');
const mov = require('../controllers/movimientos.controller');
const recetas = require('../controllers/recetas.controller');

// Inventario
router.get('/inventario', inv.listar);
router.post('/inventario/productos', verificarToken, inv.crearProducto);
router.put('/inventario/productos/:id', verificarToken, inv.editarProducto);
router.delete('/inventario/productos/:id', verificarToken, inv.eliminarProducto);
router.post('/inventario/insumos', verificarToken, inv.crearInsumo);
router.put('/inventario/insumos/:id', verificarToken, inv.editarInsumo);
router.delete('/inventario/insumos/:id', verificarToken, inv.eliminarInsumo);
router.patch('/inventario/stock-minimo/:id', verificarToken, inv.actualizarStockMinimo);
router.patch('/inventario/estado/:id', verificarToken, inv.cambiarEstado);

// Alertas
router.get('/alertas', verificarToken, alertas.listarActivas);
router.get('/alertas/historial', verificarToken, alertas.historial);
router.patch('/alertas/:id/resolver', verificarToken, alertas.resolver);

// Lotes
router.get('/lotes', verificarToken, lotes.listar);
router.post('/lotes', verificarToken, lotes.registrar);

// Movimientos
router.get('/movimientos', verificarToken, mov.listarHistorial);
router.post('/movimientos', verificarToken, mov.registrarMovimiento);

// Recetas
router.get('/recetas', recetas.listar);
router.get('/recetas/:productoId', recetas.obtener);
router.post('/recetas', verificarToken, recetas.crear);
router.put('/recetas/:productoId', verificarToken, recetas.actualizar);

module.exports = router;