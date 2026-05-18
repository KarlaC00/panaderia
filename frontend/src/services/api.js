// ─────────────────────────────────────────────────────────────
//  api.js  –  Cliente HTTP centralizado con renovación de token
//  UBICACIÓN: frontend/src/services/api.js
// ─────────────────────────────────────────────────────────────
 
export const API_URLS = {
  auth:       'http://18.216.247.135/api/auth',
  ventas:     'http://18.216.247.135/api/ventas',
  inventario: 'http://18.216.247.135/api/inventario',
};
 
// ── Helpers de localStorage ───────────────────────────────────
const getAccessToken  = () => localStorage.getItem('token');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setAccessToken  = (t) => localStorage.setItem('token', t);
 
// ── Renovar accessToken usando el refreshToken ────────────────
let isRefreshing = false;             // evita múltiples llamadas simultáneas
let refreshQueue = [];                // peticiones que esperan el nuevo token
 
const processQueue = (error, newToken = null) => {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  refreshQueue = [];
};
 
async function renovarToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No hay refresh token');
 
  const res = await fetch(`${API_URLS.auth}/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken }),
  });
 
  if (!res.ok) throw new Error('Sesión expirada');
 
  const data = await res.json();
  setAccessToken(data.accessToken);
  return data.accessToken;
}
 
// ── Función principal: httpClient ─────────────────────────────
// Reemplaza a fetch() en toda la app.
// Agrega el token automáticamente y lo renueva si expira (401).
export async function httpClient(url, options = {}) {
  // 1. Agregar token al header
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
 
  // 2. Ejecutar la petición
  let response = await fetch(url, { ...options, headers });
 
  // 3. Si el token expiró (401), intentar renovarlo UNA sola vez
  if (response.status === 401) {
    if (isRefreshing) {
      // Otro hilo ya está renovando → esperar en cola
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
        return fetch(url, { ...options, headers: retryHeaders });
      });
    }
 
    isRefreshing = true;
    try {
      const newToken = await renovarToken();
      processQueue(null, newToken);
      isRefreshing = false;
 
      // Reintentar la petición original con el token nuevo
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      response = await fetch(url, { ...options, headers: retryHeaders });
    } catch (err) {
      processQueue(err, null);
      isRefreshing = false;
      // El refresh falló → limpiar sesión y redirigir al login
      localStorage.clear();
      window.location.href = '/login';
      throw err;
    }
  }
 
  return response;
}