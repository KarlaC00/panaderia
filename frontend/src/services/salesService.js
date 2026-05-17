// ─────────────────────────────────────────────────────────────
//  salesService.js – Llamadas al ms_ventas (puerto 3002)
//  UBICACIÓN: frontend/src/services/salesService.js
// ─────────────────────────────────────────────────────────────
import { API_URLS, httpClient } from './api';

const BASE = API_URLS.ventas; // Asegúrate que en api.js apunte al puerto 3002

export async function registrarVentaService(datosVenta) {
  // datosVenta: { items: [{ producto_id, cantidad, nombre_producto? }] } — el precio lo resuelve el servidor
  const res = await httpClient(`${BASE}/ventas`, {
    method: 'POST',
    body: JSON.stringify(datosVenta),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar la venta');
  return data;
}

export async function getHistorialVentasService(filtros = {}) {
  const params = new URLSearchParams(filtros).toString();
  const res = await httpClient(`${BASE}/ventas?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener historial');
  return data;
}

export async function getResumenVentasService() {
  const res = await httpClient(`${BASE}/ventas/resumen`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener resumen');
  return data;
}