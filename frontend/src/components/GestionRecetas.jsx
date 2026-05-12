import { useState } from 'react';

export default function GestionRecetas({ productos, insumos, onRecetaCreada }) {
  const [productoId, setProductoId] = useState('');
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [nuevoIngrediente, setNuevoIngrediente] = useState({ insumo_id: '', cantidad: '' });

  const agregarIngredienteALista = (e) => {
    e.preventDefault();
    if (!nuevoIngrediente.insumo_id || !nuevoIngrediente.cantidad) {
      setMensaje({ texto: 'Selecciona un insumo y cantidad válida', tipo: 'error' });
      return;
    }

    // Buscamos el insumo comparando como Strings (compatible con UUID)
    const insumoInfo = insumos.find(i => String(i.id) === String(nuevoIngrediente.insumo_id));
    
    if (insumoInfo) {
      setIngredientesSeleccionados([
        ...ingredientesSeleccionados,
        { 
          insumo_id: nuevoIngrediente.insumo_id, // Mantenemos el UUID como string
          nombre: insumoInfo.nombre, 
          cantidad: nuevoIngrediente.cantidad,
          unidad: insumoInfo.unidad_medida 
        }
      ]);
      setNuevoIngrediente({ insumo_id: '', cantidad: '' });
      setMensaje({ texto: '', tipo: '' });
    }
  };

  const eliminarDeLista = (index) => {
    setIngredientesSeleccionados(ingredientesSeleccionados.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productoId || ingredientesSeleccionados.length === 0) {
      setMensaje({ texto: 'Debes elegir un producto y al menos un ingrediente', tipo: 'error' });
      return;
    }

    // IMPORTANTE: No usamos parseInt() porque tu DB usa UUID (strings)
    const payload = {
      producto_id: productoId, 
      insumos: ingredientesSeleccionados.map(i => ({
        insumo_id: i.insumo_id,
        cantidad_requerida: parseFloat(i.cantidad)
      }))
    };

    try {
      const response = await fetch('http://localhost:3003/recetas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje({ texto: '¡Receta guardada con éxito!', tipo: 'success' });
        setIngredientesSeleccionados([]);
        setProductoId('');
        if (onRecetaCreada) onRecetaCreada();
      } else {
        // Mostramos el error específico que devuelve tu backend
        setMensaje({ 
          texto: `Error del servidor: ${data.error || data.message || 'Error desconocido'}`, 
          tipo: 'error' 
        });
      }
    } catch (err) {
      setMensaje({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginTop: 0 }}>🛠 Configurar Ficha Técnica (Receta)</h3>
      
      <div style={sectionStyle}>
        <label>1. Seleccionar Producto:</label>
        <select style={inputStyle} value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          <option value="">Seleccione un producto...</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div style={sectionStyle}>
        <label>2. Agregar Ingredientes:</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <select 
            style={inputStyle}
            value={nuevoIngrediente.insumo_id}
            onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, insumo_id: e.target.value})}
          >
            <option value="">Seleccione un insumo...</option>
            {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
          </select>
          <input 
            type="number" 
            placeholder="Cant." 
            style={{...inputStyle, width: '100px'}}
            value={nuevoIngrediente.cantidad}
            onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, cantidad: e.target.value})}
          />
          <button type="button" onClick={agregarIngredienteALista} style={btnPlus}>+</button>
        </div>

        <div style={listContainer}>
          {ingredientesSeleccionados.length === 0 ? (
            <small style={{ color: '#888' }}>No hay ingredientes añadidos.</small>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {ingredientesSeleccionados.map((ing, idx) => (
                <li key={idx} style={{ marginBottom: '5px' }}>
                  {ing.nombre}: {ing.cantidad} {ing.unidad} 
                  <button type="button" onClick={() => eliminarDeLista(idx)} style={btnDelete}>🗑</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button onClick={handleSubmit} style={btnGuardar}>Guardar Receta Completa</button>
      
      {mensaje.texto && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          borderRadius: '4px',
          backgroundColor: mensaje.tipo === 'error' ? '#f8d7da' : '#d4edda',
          color: mensaje.tipo === 'error' ? '#721c24' : '#155724',
          border: '1px solid'
        }}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}

// Estilos
const containerStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '2px solid #6c757d', marginTop: '20px' };
const sectionStyle = { marginBottom: '15px' };
const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' };
const btnPlus = { backgroundColor: '#333', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '24px' };
const btnGuardar = { backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '12px', width: '100%', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const listContainer = { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px solid #eee' };
const btnDelete = { marginLeft: '15px', color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer' };