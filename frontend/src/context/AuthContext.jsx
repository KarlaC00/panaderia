// ─────────────────────────────────────────────────────────────
//  AuthContext.jsx  –  Estado global de autenticación
//  UBICACIÓN: frontend/src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────
import { createContext, useState, useEffect } from 'react';
import { logoutService } from '../services/authService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar la app, restaurar sesión si existe en localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token     = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Guardar sesión después del login
  const login = (data) => {
    // data = { accessToken, refreshToken, usuario: { id, nombre, rol } }
    setUser(data.usuario);
    localStorage.setItem('user',         JSON.stringify(data.usuario));
    localStorage.setItem('token',        data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  // Cerrar sesión: primero invalidar en backend, luego limpiar local
  const logout = async () => {
    await logoutService();   // ← llama POST /auth/logout en el backend
    setUser(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
