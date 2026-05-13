// ─────────────────────────────────────────────────────────────
//  authService.js  –  Login y Logout contra el ms_auth
//  UBICACIÓN: frontend/src/services/authService.js
// ─────────────────────────────────────────────────────────────
import { API_URLS, httpClient } from './api';
 
// ── POST /auth/login ──────────────────────────────────────────
// Devuelve: { accessToken, refreshToken, usuario: { id, nombre, rol } }
export async function loginService(correo, contrasena) {
  const res = await fetch(`${API_URLS.auth}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ correo, contrasena }),
  });
 
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
  return data;
}
 
// ── POST /auth/logout ─────────────────────────────────────────
// Invalida el refreshToken en la base de datos
export async function logoutService() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return; // ya no hay sesión
 
  try {
    await httpClient(`${API_URLS.auth}/auth/logout`, {
      method: 'POST',
      body:   JSON.stringify({ refreshToken }),
    });
  } catch {
    // Si falla la red igual limpiamos localmente
  }
}
 
// ── POST /auth/refresh ────────────────────────────────────────
// Este se llama automáticamente desde api.js; aquí por si lo necesitas manual
export async function refreshService() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No hay refresh token');
 
  const res = await fetch(`${API_URLS.auth}/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken }),
  });
 
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sesión expirada');
  return data; // { accessToken }
}

// ── PATCH /auth/perfil ─────────────────────────────────────────
export async function updateProfileService(datosPerfil) {
  const res = await httpClient(`${API_URLS.auth}/auth/perfil`, {
    method: 'PATCH',
    body: JSON.stringify(datosPerfil),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');
  return data;
}

// ── POST /auth/cambiar-contrasena ──────────────────────────────
export async function changePasswordService(contrasenaActual, contrasenaNueva) {
  const res = await httpClient(`${API_URLS.auth}/auth/cambiar-contrasena`, {
    method: 'POST',
    body: JSON.stringify({ contrasenaActual, contrasenaNueva }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
  return data;
}