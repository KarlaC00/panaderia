import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Si no hay usuario logueado, el navbar no se muestra (o podrías mostrar solo un logo)
  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ 
      padding: '15px', 
      background: '#333', 
      color: 'white', 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center' 
    }}>
      <div>
        <strong style={{ marginRight: '20px' }}>MAXIPAN 🥖</strong>
        
        <Link to="/dashboard" style={linkStyle}>Inicio</Link>
        <Link to="/ventas" style={linkStyle}>Ventas</Link>

        {/* IMPORTANTE: Solo mostramos estos links si el usuario 
            tiene el rol exacto de 'administrador' que viene de tu DB
        */}
        {user.rol === 'administrador' && (
          <>
            <Link to="/inventario" style={linkStyle}>Inventario</Link>
            <Link to="/usuarios" style={{ ...linkStyle, color: '#ffcc00', fontWeight: 'bold' }}>
              👥 Gestión de Usuarios
            </Link>
          </>
        )}
      </div>

      <div>
        <span style={{ marginRight: '15px' }}>{user.nombre} ({user.rol})</span>
        <button onClick={handleLogout} style={buttonStyle}>Cerrar Sesión</button>
      </div>
    </nav>
  );
}

// Estilos rápidos para que no se vea desordenado
const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  marginRight: '15px',
  fontSize: '14px'
};

const buttonStyle = {
  background: '#ff4d4d',
  color: 'white',
  border: 'none',
  padding: '5px 10px',
  borderRadius: '4px',
  cursor: 'pointer'
};