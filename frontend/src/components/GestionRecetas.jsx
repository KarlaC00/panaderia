import { useState, useEffect } from 'react';

export default function GestionRecetas({ productos, insumos, onRecetaCreada }) {
  const [modo, setModo] = useState('crear');
  const [productoId, setProductoId] = useState('');
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [nuevoIngrediente, setNuevoIngrediente] = useState({ insumo_id: '', cantidad: '' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [recetasExistentes, setRecetasExistentes] = useState([]);
  const [cargandoReceta, setCargandoReceta] = useState(false);

  useEffect(() => {
    cargarRecetasExistentes();
  }, []);

  const cargarRecetasExistentes = async () => {
    try {
      const res = await fetch('http://localhost:3003/recetas', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecetasExistentes(data);
      }
    } catch (err) {
      console.error('Error al cargar recetas existentes:', err);
    }
  };

  const handleProductoChange = async (id) => {
    setProductoId(id);
    setIngredientesSeleccionados([]);
    if (!id || modo !== 'editar') return;

    setCargandoReceta(true);
    setMensaje({ texto: '', tipo: '' });
    try {
      const res = await fetch(`http://localhost:3003/recetas/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIngredientesSeleccionados(
          data.insumos.map(i => ({
            insumo_id: i.insumo_id,
            nombre: i.nombre,
            cantidad: String(i.cantidad_requerida),
            unidad: i.unidad_medida
          }))
        );
        setMensaje({ texto: 'Receta cargada. Modifica los ingredientes y guarda.', tipo: 'info' });
      } else {
        setMensaje({ texto: 'Este producto no tiene receta aún. Puedes crearla aquí.', tipo: 'info' });
      }
    } catch {
      setMensaje({ texto: 'Error al cargar la receta', tipo: 'error' });
    } finally {
      setCargandoReceta(false);
    }
  };

  const agregarIngredienteALista = (e) => {
    e.preventDefault();
    if (!nuevoIngrediente.insumo_id || !nuevoIngrediente.cantidad) {
      setMensaje({ texto: 'Selecciona un insumo y una cantidad válida', tipo: 'error' });
      return;
    }
    if (ingredientesSeleccionados.find(i => String(i.insumo_id) === String(nuevoIngrediente.insumo_id))) {
      setMensaje({ texto: 'Ese insumo ya está en la lista. Modifica su cantidad directamente.', tipo: 'error' });
      return;
    }

    const insumoInfo = insumos.find(i => String(i.id) === String(nuevoIngrediente.insumo_id));
    if (insumoInfo) {
      setIngredientesSeleccionados([
        ...ingredientesSeleccionados,
        {
          insumo_id: nuevoIngrediente.insumo_id,
          nombre: insumoInfo.nombre,
          cantidad: nuevoIngrediente.cantidad,
          unidad: insumoInfo.unidad_medida
        }
      ]);
      setNuevoIngrediente({ insumo_id: '', cantidad: '' });
      setMensaje({ texto: '', tipo: '' });
    }
  };

  const actualizarCantidad = (index, valor) => {
    const copia = [...ingredientesSeleccionados];
    copia[index] = { ...copia[index], cantidad: valor };
    setIngredientesSeleccionados(copia);
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

    const payload = {
      producto_id: productoId,
      insumos: ingredientesSeleccionados.map(i => ({
        insumo_id: i.insumo_id,
        cantidad_requerida: parseFloat(i.cantidad)
      }))
    };

    const esEdicion = modo === 'editar';
    const url = esEdicion
      ? `http://localhost:3003/recetas/${productoId}`
      : 'http://localhost:3003/recetas';
    const method = esEdicion ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje({
          texto: esEdicion ? '✅ ¡Receta actualizada con éxito!' : '✅ ¡Receta guardada con éxito!',
          tipo: 'success'
        });
        setIngredientesSeleccionados([]);
        setProductoId('');
        cargarRecetasExistentes();
        if (onRecetaCreada) onRecetaCreada();
      } else {
        setMensaje({
          texto: `Error: ${data.error || data.message || 'Error desconocido'}`,
          tipo: 'error'
        });
      }
    } catch {
      setMensaje({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
  };

  const productosConReceta = new Set(recetasExistentes.map(r => String(r.producto_id)));
  const productosMostrados = modo === 'editar'
    ? productos.filter(p => productosConReceta.has(String(p.id)))
    : productos;

  return (
    <div style={containerStyle}>
      <h3 style={{ marginTop: 0 }}>🛠 Gestión de Fichas Técnicas (Recetas)</h3>

      <div style={toggleContainer}>
        <button
          type="button"
          onClick={() => { setModo('crear'); setProductoId(''); setIngredientesSeleccionados([]); setMensaje({ texto: '', tipo: '' }); }}
          style={modo === 'crear' ? btnToggleActive : btnToggle}
        >
          ➕ Crear nueva receta
        </button>
        <button
          type="button"
          onClick={() => { setModo('editar'); setProductoId(''); setIngredientesSeleccionados([]); setMensaje({ texto: '', tipo: '' }); }}
          style={modo === 'editar' ? btnToggleActive : btnToggle}
        >
          ✏️ Modificar receta existente
        </button>
      </div>

      {modo === 'editar' && recetasExistentes.length === 0 && (
        <p style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
          No hay recetas registradas aún. Crea una primero.
        </p>
      )}

      <div style={sectionStyle}>
        <label>1. Seleccionar Producto{modo === 'editar' ? ' (con receta)' : ''}:</label>
        <select
          style={inputStyle}
          value={productoId}
          onChange={(e) => handleProductoChange(e.target.value)}
        >
          <option value="">Seleccione un producto...</option>
          {productosMostrados.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        {cargandoReceta && <small style={{ color: '#666' }}> Cargando receta actual...</small>}
      </div>

      <div style={sectionStyle}>
        <label>2. Ingredientes:</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <select
            style={inputStyle}
            value={nuevoIngrediente.insumo_id}
            onChange={(e) => setNuevoIngrediente({ ...nuevoIngrediente, insumo_id: e.target.value })}
          >
            <option value="">Seleccione un insumo...</option>
            {insumos.map(i => (
              <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Cant."
            style={{ ...inputStyle, width: '100px' }}
            value={nuevoIngrediente.cantidad}
            onChange={(e) => setNuevoIngrediente({ ...nuevoIngrediente, cantidad: e.target.value })}
          />
          <button type="button" onClick={agregarIngredienteALista} style={btnPlus}>+</button>
        </div>

        <div style={listContainer}>
          {ingredientesSeleccionados.length === 0 ? (
            <small style={{ color: '#888' }}>No hay ingredientes añadidos.</small>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: '0.85em', color: '#555' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Insumo</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Cantidad</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Unidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ingredientesSeleccionados.map((ing, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px' }}>{ing.nombre}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        value={ing.cantidad}
                        onChange={(e) => actualizarCantidad(idx, e.target.value)}
                        style={{ width: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', color: '#666' }}>{ing.unidad}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <button type="button" onClick={() => eliminarDeLista(idx)} style={btnDelete}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <button onClick={handleSubmit} style={btnGuardar}>
        {modo === 'crear' ? '💾 Guardar Receta Nueva' : '💾 Guardar Cambios'}
      </button>

      {mensaje.texto && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          borderRadius: '4px',
          backgroundColor:
            mensaje.tipo === 'error' ? '#f8d7da'
            : mensaje.tipo === 'info' ? '#d1ecf1'
            : '#d4edda',
          color:
            mensaje.tipo === 'error' ? '#721c24'
            : mensaje.tipo === 'info' ? '#0c5460'
            : '#155724',
          border: '1px solid'
        }}>
          {mensaje.texto}
        </div>
      )}

      {recetasExistentes.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#555', marginBottom: '8px' }}>📋 Recetas activas registradas</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={th}>Producto</th>
                <th style={th}>Ingredientes</th>
              </tr>
            </thead>
            <tbody>
              {recetasExistentes.map(r => (
                <tr key={r.receta_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}><strong>{r.producto_nombre}</strong></td>
                  <td style={td}>
                    {r.insumos.map((i, idx) => (
                      <span key={idx} style={badge}>
                        {i.nombre}: {i.cantidad_requerida} {i.unidad_medida}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const containerStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '2px solid #6c757d', marginTop: '20px' };
const sectionStyle = { marginBottom: '15px' };
const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' };
const btnPlus = { backgroundColor: '#333', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '24px' };
const btnGuardar = { backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '12px', width: '100%', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const listContainer = { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px solid #eee', minHeight: '50px' };
const btnDelete = { color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1em' };
const toggleContainer = { display: 'flex', gap: '10px', marginBottom: '20px' };
const btnToggle = { padding: '8px 16px', border: '2px solid #6c757d', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fff', color: '#6c757d', fontWeight: 'bold' };
const btnToggleActive = { ...btnToggle, backgroundColor: '#6c757d', color: '#fff' };
const th = { padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' };
const td = { padding: '8px 12px' };
const badge = { display: 'inline-block', margin: '2px 4px', padding: '2px 8px', backgroundColor: '#e9ecef', borderRadius: '12px', fontSize: '0.85em' };