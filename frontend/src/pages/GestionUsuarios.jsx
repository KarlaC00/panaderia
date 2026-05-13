import { useState, useEffect } from 'react';
import { createUserService, listUsersService, toggleUserStatusService } from '../services/userService';

export default function GestionUsuarios() {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    rol: 'empleado'
  });
  const [usuarios, setUsuarios] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const data = await listUsersService();
      setUsuarios(data);
    } catch (err) { 
      console.error(err); 
      setUsuarios([]); // Aseguramos que sea array si falla
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    try {
      await createUserService(formData);
      setMensaje({ texto: '¡Usuario creado con éxito!', tipo: 'success' });
      setFormData({ nombre: '', correo: '', contrasena: '', rol: 'empleado' });
      cargarUsuarios();
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    }
  };

  // --- FUNCIÓN PARA ACTIVAR/DESACTIVAR ---
  const handleToggleStatus = async (id, activo) => {
    try {
      await toggleUserStatusService(id, activo);
      cargarUsuarios(); // Refrescar la tabla tras el cambio
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Gestión de Personal - MAXIPAN</h2>
      
      <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h3>Registrar Nuevo Usuario</h3>
        {mensaje.texto && (
          <p style={{ 
            padding: '10px', 
            backgroundColor: mensaje.tipo === 'error' ? '#f8d7da' : '#d4edda',
            color: mensaje.tipo === 'error' ? '#721c24' : '#155724',
            borderRadius: '4px'
          }}>
            {mensaje.texto}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Nombre completo" value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})} required style={inputStyle}/><br/>
          
          <input type="email" placeholder="Correo electrónico" value={formData.correo} 
            onChange={e => setFormData({...formData, correo: e.target.value})} required style={inputStyle}/><br/>
          
          <input type="password" placeholder="Contraseña temporal" value={formData.contrasena} 
            onChange={e => setFormData({...formData, contrasena: e.target.value})} required style={inputStyle}/><br/>
          
          <label>Asignar Rol: </label>
          <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} style={inputStyle}>
            <option value="empleado">Empleado (Vendedor)</option>
            <option value="administrador">Administrador</option>
          </select><br/>
          
          <button type="submit" style={btnPrimary}>Crear Usuario</button>
        </form>
      </div>

      <h3>Usuarios Registrados</h3>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado (Clic para cambiar)</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(usuarios) && usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>{u.correo}</td>
              <td><span style={badgeStyle}>{u.rol}</span></td>
              <td>
                <button 
                  onClick={() => handleToggleStatus(u.id, u.activo)}
                  style={{
                    ...btnStatus,
                    backgroundColor: u.activo ? '#d4edda' : '#f8d7da',
                    color: u.activo ? '#155724' : '#721c24',
                    borderColor: u.activo ? '#c3e6cb' : '#f5c6cb'
                  }}
                >
                  {u.activo ? '✅ Activo' : '❌ Inactivo'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- ESTILOS RÁPIDOS ---
const inputStyle = { padding: '8px', marginBottom: '10px', width: '250px', borderRadius: '4px', border: '1px solid #ccc' };
const btnPrimary = { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const btnStatus = { padding: '5px 12px', border: '1px solid', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' };
const badgeStyle = { padding: '2px 8px', backgroundColor: '#e9ecef', borderRadius: '12px', fontSize: '0.85em', textTransform: 'capitalize' };