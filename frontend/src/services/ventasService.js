// ─────────────────────────────────────────────────────────────
//  ventasService.js  –  Llamadas al ms_ventas (puerto 3002)
//  UBICACIÓN: frontend/src/services/ventasService.js
// ─────────────────────────────────────────────────────────────
import { API_URLS, httpClient } from './api';

const BASE = API_URLS.ventas;

// ── GET /ventas ───────────────────────────────────────────────
// Lista todas las ventas (admin y empleado)
export async function getVentas() {
  const res = await httpClient(`${BASE}/ventas`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener ventas');
  return data;
}

// ── POST /ventas ──────────────────────────────────────────────
// Registrar una venta nueva
// venta = { productos: [{ producto_id, cantidad, precio_unitario }] }
export async function registrarVenta(venta) {
  const res = await httpClient(`${BASE}/ventas`, {
    method: 'POST',
    body:   JSON.stringify(venta),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar venta');
  return data;
}

// ── GET /ventas/resumen ───────────────────────────────────────
// Totales del día para el Dashboard
export async function getResumenVentas() {
  const res = await httpClient(`${BASE}/ventas/resumen`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener resumen');
  return data;
}
