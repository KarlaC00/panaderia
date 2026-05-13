import { useState, useEffect } from 'react';
import RegistrarLote from '../components/RegistrarLote';
import GestionRecetas from '../components/GestionRecetas'; 
import { 
  getInventoryService, 
  createProductService, 
  createInsumoService,
  deleteItemService,
  getLotesService,
  getMovimientosService
} from '../services/inventoryService';

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [tab, setTab] = useState('productos'); 
  const [showForm, setShowForm] = useState(false);
  const [showRecetaForm, setShowRecetaForm] = useState(false); 
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  
  const [newData, setNewData] = useState({ 
    nombre: '', 
    unidad_medida: 'unidades', 
    stock_minimo: 0 
  });

  useEffect(() => {
    cargarDatos();
  }, [tab]);

  const cargarDatos = async () => {
    try {
      const [invData, lotesData] = await Promise.all([
        getInventoryService(true),
        getLotesService()
      ]);
      
      // ✅ AJUSTE: Validar que la data exista antes de setear para evitar errores visuales
      setProductos(invData?.productos || []);
      setInsumos(invData?.insumos || []);
      setLotes(Array.isArray(lotesData) ? lotesData : []);

      if (tab === 'historial') {
        const movData = await getMovimientosService();
        setMovimientos(Array.isArray(movData) ? movData : []);
      }
    } catch (err) {
      console.error("Error al cargar datos", err);
      setMensaje({ texto: 'Error al conectar con el servidor', tipo: 'error' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (tab === 'productos') {
        await createProductService(newData);
      } else {
        await createInsumoService(newData);
      }
      setMensaje({ texto: 'Registrado con éxito', tipo: 'success' });
      setShowForm(false);
      setNewData({ nombre: '', unidad_medida: 'unidades', stock_minimo: 0 });
      cargarDatos();
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    }
  };

  const handleDelete = async (id, tipo) => {
    if (!window.confirm("¿Estás seguro de eliminar este elemento?")) return;
    try {
      const res = await deleteItemService(id, tipo);
      alert(res.mensaje || "Eliminado correctamente");
      cargarDatos();
    } catch (err) {
      alert(err.message); 
    }
  };

  const alertasVencimiento = lotes.filter(l => l.estado === 'por_vencer' || l.estado === 'vencido');

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      <div style={{ flex: 3 }}>
        <h1>📦 Panel de Control - MAXIPAN</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => setTab('productos')} style={tab === 'productos' ? btnActive : btnStyle}>Productos (Venta)</button>
          <button onClick={() => setTab('insumos')} style={tab === 'insumos' ? btnActive : btnStyle}>Insumos (Materia Prima)</button>
          <button onClick={() => setTab('historial')} style={tab === 'historial' ? btnActive : btnStyle}>📜 Historial (Kardex)</button>
        </div>

        {tab !== 'historial' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button 
              onClick={() => { setShowForm(!showForm); setShowRecetaForm(false); setMensaje({texto:'', tipo:''}); }} 
              style={btnAgregar}
            >
              {showForm ? '✖ Cancelar' : `➕ Nuevo ${tab === 'productos' ? 'Producto' : 'Insumo'}`}
            </button>

            <button 
              onClick={() => { setShowRecetaForm(!showRecetaForm); setShowForm(false); }} 
              style={btnReceta}
            >
              {showRecetaForm ? '✖ Cerrar Recetas' : '🛠 Configurar Recetas'}
            </button>
          </div>
        )}

        {showForm && tab !== 'historial' && (
          <form onSubmit={handleSave} style={formContainer}>
            <h3>Crear {tab === 'productos' ? 'Producto' : 'Insumo'}</h3>
            <input 
              type="text" placeholder="Nombre" required style={inputStyle}
              value={newData.nombre} onChange={e => setNewData({...newData, nombre: e.target.value})}
            /><br/>
            <label>Unidad: </label>
            <select style={inputStyle} value={newData.unidad_medida} onChange={e => setNewData({...newData, unidad_medida: e.target.value})}>
              <option value="unidades">Unidades</option>
              <option value="kg">Kilogramos (kg)</option>
              <option value="gr">Gramos (gr)</option>
              <option value="litros">Litros</option>
            </select><br/>
            <label>Stock Mínimo: </label>
            <input 
              type="number" style={inputStyle}
              value={newData.stock_minimo} onChange={e => setNewData({...newData, stock_minimo: e.target.value})}
            /><br/>
            <button type="submit" style={btnGuardar}>Guardar en Sistema</button>
          </form>
        )}

        {showRecetaForm && tab !== 'historial' && (
          <GestionRecetas 
            productos={productos} 
            insumos={insumos} 
            onRecetaCreada={cargarDatos} 
          />
        )}

        {mensaje.texto && <p style={{ color: mensaje.tipo === 'error' ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>{mensaje.texto}</p>}

        {tab === 'historial' ? (
          <section>
            <h3 style={{ color: '#555' }}>Historial de Entradas y Salidas</h3>
            <table border="1" style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#f4f4f4' }}>
                  <th style={{ padding: '10px' }}>Fecha y Hora</th>
                  <th style={{ padding: '10px' }}>Insumo</th>
                  <th style={{ padding: '10px' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {movimientos && movimientos.length > 0 ? (
                  movimientos.map(m => (
                    <tr key={m.id}>
                      <td style={tdStyle}>{m.fecha_hora ? new Date(m.fecha_hora).toLocaleString('es-CO') : 'Fecha no disp.'}</td>
                      <td style={tdStyle}><strong>{m.insumo_nombre || 'N/A'}</strong></td>
                      <td style={tdStyle}>{Number(m.cantidad || 0).toLocaleString('es-CO')}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No hay movimientos registrados.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        ) : (
          <table border="1" style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ padding: '10px' }}>Nombre</th>
                <th style={{ padding: '10px' }}>Stock {tab === 'productos' ? 'Estimado' : 'Actual'}</th>
                <th style={{ padding: '10px' }}>Mínimo</th>
                <th style={{ padding: '10px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'productos' ? productos : insumos).map(item => (
              <tr key={item.id}>
                <td style={{ padding: '8px' }}>{item.nombre}</td>
                <td style={{ 
                  padding: '8px',
                  fontWeight: 'bold', 
                  color: (item.stock_estimado || item.stock_actual || 0) <= (item.stock_minimo || 0) ? '#dc3545' : '#28a745' 
                }}>
                  {tab === 'productos' 
                    ? Number(item.stock_estimado || 0).toLocaleString('es-CO') 
                    : Number(item.stock_actual || 0).toLocaleString('es-CO')
                  } {item.unidad_medida?.toLowerCase() || 'unid'} {/* <--- AQUÍ ESTÁ EL ARREGLO */}
                </td>
                <td style={{ padding: '8px' }}>
                  {Number(item.stock_minimo || 0).toLocaleString('es-CO')}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleDelete(item.id, tab === 'productos' ? 'producto' : 'insumo')} 
                    style={btnEliminar}
                  >
                    🗑 Eliminar
                  </button>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PANEL LATERAL DE ALERTAS */}
      <div style={panelAlertas}>
        <RegistrarLote insumos={insumos} onLoteRegistrado={cargarDatos} />
        <hr style={{ margin: '20px 0' }} />
        <h3>⚠️ Alertas de Lotes</h3>
        {alertasVencimiento.length === 0 ? (
          <p style={{ color: 'green', fontSize: '0.9em' }}>No hay lotes próximos a vencer.</p>
        ) : (
          alertasVencimiento.map(l => (
            <div key={l.id} style={{ 
              backgroundColor: l.estado === 'vencido' ? '#f8d7da' : '#fff3cd',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '10px',
              borderLeft: `5px solid ${l.estado === 'vencido' ? '#721c24' : '#856404'}`
            }}>
              <strong>{l.insumo || 'Insumo desconocido'}</strong><br/>
              <small>Lote: {l.numero_lote || 'S/N'}</small><br/>
              <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>
                {l.estado === 'vencido' ? 'VENCIDO' : `Vence en ${l.dias_para_vencer} días`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Estilos
const btnStyle = { padding: '10px 20px', cursor: 'pointer', marginRight: '5px', border: '1px solid #ccc', borderRadius: '4px', transition: '0.3s' };
const btnActive = { ...btnStyle, backgroundColor: '#333', color: 'white' };
const btnAgregar = { backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const btnReceta = { backgroundColor: '#6c757d', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const btnGuardar = { backgroundColor: '#28a745', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' };
const btnEliminar = { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' };
const formContainer = { border: '1px solid #ddd', padding: '20px', marginBottom: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' };
const inputStyle = { padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', maxWidth: '250px' };
const panelAlertas = { flex: 1, backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', height: 'fit-content', position: 'sticky', top: '20px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px', backgroundColor: 'white' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #eee' };