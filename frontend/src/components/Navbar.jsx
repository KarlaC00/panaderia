import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return null; // No mostrar si no está logueado

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ padding: '10px', background: '#eee', marginBottom: '20px' }}>
      <Link to="/dashboard">Inicio</Link> | 
      <Link to="/ventas"> Ventas</Link> | 
      
      {user.rol === 'admin' && (
        <>
          <Link to="/inventario"> Inventario</Link> | 
        </>
      )}
      
      <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Cerrar Sesión</button>
      <span style={{ marginLeft: '10px' }}> (Usuario: {user.rol})</span>
    </nav>
  );
}