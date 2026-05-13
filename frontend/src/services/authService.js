import { API_URLS } from './api';

export const loginService = async (correo, contrasena) => {
  const response = await fetch(`${API_URLS.auth}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al iniciar sesión');
  }

  return data; // Devuelve { accessToken, refreshToken, usuario: { id, nombre, rol } }
};