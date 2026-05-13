import { API_URLS, httpClient } from './api';

const BASE = API_URLS.inventario;

// --- INVENTARIO ---
export async function getInventoryService(incluirInactivos = false) {
  const url = incluirInactivos
    ? `${BASE}/inventario?incluir_inactivos=true`
    : `${BASE}/inventario`;
  const res = await httpClient(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener inventario');
  return data;
}

export async function createProductService(producto) {
  // producto: { nombre, unidad_medida, precio_unitario, stock_minimo }
  const res = await httpClient(`${BASE}/inventario/productos`, {
    method: 'POST',
    body: JSON.stringify(producto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear producto');
  return data;
}

export async function updateProductService(id, campos) {
  // campos: { nombre, unidad_medida, precio_unitario, stock_minimo, activo }
  const res = await httpClient(`${BASE}/inventario/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(campos),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al editar producto');
  return data;
}

export async function createInsumoService(insumo) {
  // insumo: { nombre, unidad_medida, stock_minimo }
  const res = await httpClient(`${BASE}/inventario/insumos`, {
    method: 'POST',
    body: JSON.stringify(insumo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear insumo');
  return data;
}

export async function updateInsumoService(id, campos) {
  // campos: { nombre, unidad_medida, stock_minimo, activo }
  const res = await httpClient(`${BASE}/inventario/insumos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(campos),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al editar insumo');
  return data;
}

export async function deleteItemService(id, tipo) {
  const endpoint = tipo === 'producto' ? 'productos' : 'insumos';
  const res = await httpClient(`${BASE}/inventario/${endpoint}/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cambiar estado');
  return data;
}

// --- LOTES ---
export async function getLotesService() {
  const res = await httpClient(`${BASE}/lotes`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener lotes');
  return data;
}

export async function registrarLoteService(lote) {
  const res = await httpClient(`${BASE}/lotes`, {
    method: 'POST',
    body: JSON.stringify(lote),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar lote');
  return data;
}

// --- ALERTAS ---
export async function getAlertasService() {
  const res = await httpClient(`${BASE}/alertas`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener alertas');
  return data;
}

export async function getHistorialAlertasService() {
  const res = await httpClient(`${BASE}/alertas/historial`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener historial de alertas');
  return data;
}

export async function resolverAlertaService(id) {
  const res = await httpClient(`${BASE}/alertas/${id}/resolver`, {
    method: 'PATCH',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al resolver alerta');
  return data;
}

// --- RECETAS ---
export async function getRecetaService(productoId) {
  const res = await httpClient(`${BASE}/recetas/${productoId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener receta');
  return data;
}

// --- MOVIMIENTOS (KARDEX) ---
export async function getMovimientosService() {
  const res = await httpClient(`${BASE}/movimientos`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener historial');
  return data;
}

export async function registrarMovimientoService(movimiento) {
  const res = await httpClient(`${BASE}/movimientos`, {
    method: 'POST',
    body: JSON.stringify(movimiento),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar movimiento');
  return data;
}