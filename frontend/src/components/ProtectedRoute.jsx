import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Cargando...</div>;

  // Si no hay usuario, al Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol del usuario no está en la lista de permitidos, al Dashboard
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}  