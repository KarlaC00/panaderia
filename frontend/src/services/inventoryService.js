// ─────────────────────────────────────────────────────────────
//  inventoryService.js – Unificado para MS_INVENTARIO (Puerto 3003)
//  UBICACIÓN: frontend/src/services/inventoryService.js
// ─────────────────────────────────────────────────────────────
import { API_URLS, httpClient } from './api';

const BASE = API_URLS.inventario;

// --- INVENTARIO (PRODUCTOS E INSUMOS) ---

export async function getInventoryService() {
  const res = await httpClient(`${BASE}/inventario`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener inventario');
  return data;
}

export async function createProductService(producto) {
  const res = await httpClient(`${BASE}/inventario/productos`, {
    method: 'POST',
    body: JSON.stringify(producto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear producto');
  return data;
}

export async function createInsumoService(insumo) {
  const res = await httpClient(`${BASE}/inventario/insumos`, {
    method: 'POST',
    body: JSON.stringify(insumo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear insumo');
  return data;
}

export async function deleteItemService(id, tipo) {
  const endpoint = tipo === 'producto' ? 'productos' : 'insumos';
  const res = await httpClient(`${BASE}/inventario/${endpoint}/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar');
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