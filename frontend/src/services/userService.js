import { API_URLS } from './api';

export const createUserService = async (userData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URLS.auth}/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al crear el usuario');
  return data;
};

export const listUsersService = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URLS.auth}/usuarios`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// --- NUEVA FUNCIÓN PARA CAMBIAR ESTADO ---
export const toggleUserStatusService = async (id, actualmenteActivo) => {
  const token = localStorage.getItem('token');
  const accion = actualmenteActivo ? 'desactivar' : 'activar';
  
  const response = await fetch(`${API_URLS.auth}/usuarios/${id}/${accion}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al cambiar estado');
  return data;
};