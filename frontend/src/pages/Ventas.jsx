import { useState, useEffect } from 'react';
import { getInventoryService } from '../services/inventoryService';
import { registrarVentaService, getHistorialVentasService } from '../services/salesService';

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [errorHistorial, setErrorHistorial] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const inv = await getInventoryService();
      setProductos(inv.productos || inv || []);
    } catch (err) {
      setMensaje({ texto: 'Error al cargar el inventario', tipo: 'error' });
      console.error('Error inventario:', err);
    }

    try {
      const hist = await getHistorialVentasService();
      setHistorial(hist.datos || hist || []);
      setErrorHistorial(false);
    } catch (err) {
      console.warn('Historial de ventas no disponible:', err.message);
      setErrorHistorial(true);
      setHistorial([]);
    }
  };

  const agregarAlCarrito = (prod) => {
    const existe = carrito.find(item => item.id === prod.id);
    if (existe) {
      setCarrito(carrito.map(item =>
        item.id === prod.id ? { ...item, cantidad_vender: item.cantidad_vender + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...prod, cantidad_vender: 1, precio_unitario: prod.precio_venta || 0 }]);
    }
  };

  const actualizarCantidadCarrito = (id, valor) => {
    setCarrito(carrito.map(item =>
      item.id === id ? { ...item, cantidad_vender: Number(valor) } : item
    ));
  };

  const actualizarPrecioCarrito = (id, valor) => {
    setCarrito(carrito.map(item =>
      item.id === id ? { ...item, precio_unitario: Number(valor) } : item
    ));
  };

  const quitarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const totalVenta = carrito.reduce((acc, item) => acc + (item.cantidad_vender * item.precio_unitario), 0);

  const handleVender = async () => {
    if (carrito.length === 0) return alert('El carrito está vacío');

    const sinStock = carrito.find(item => item.cantidad_vender > item.stock_estimado);
    if (sinStock) {
      if (!window.confirm(`Atención: Estás vendiendo más de lo que hay en stock de ${sinStock.nombre}. ¿Deseas continuar?`)) return;
    }

    try {
      const payload = {
        items: carrito.map(item => ({
          producto_id: item.id,
          nombre_producto: item.nombre,
          cantidad: item.cantidad_vender,
          precio_unitario: item.precio_unitario
        }))
      };

      await registrarVentaService(payload);
      setMensaje({ texto: '¡Venta realizada con éxito!', tipo: 'success' });
      setCarrito([]);
      cargarDatos();
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const historialAgrupado = Object.values(
    (Array.isArray(historial) ? historial : []).reduce((acc, current) => {
      if (!acc[current.id]) {
        acc[current.id] = { ...current, items: [] };
      }
      if (current.nombre_producto) {
        acc[current.id].items.push(`${current.nombre_producto} (x${current.cantidad})`);
      }
      return acc;
    }, {})
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>🛒 Punto de Venta - MAXIPAN</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '20px' }}>

        <section style={seccionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>🔍 Productos en Inventario</h3>
            <span style={{ fontSize: '0.8em', color: '#666' }}>{productosFiltrados.length} encontrados</span>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre de pan o producto..."
            style={inputSearch}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={headerTable}>
                  <th style={thStyle}>Producto</th>
                  <th style={thStyle}>Stock Actual</th>
                  <th style={thStyle}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No hay productos disponibles.</td></tr>
                ) : productosFiltrados.map(p => (
                  <tr key={p.id} style={trHover}>
                    <td style={tdStyle}>{p.nombre}</td>
                    <td style={{ ...tdStyle, color: p.stock_estimado <= 5 ? '#d9534f' : '#28a745', fontWeight: 'bold' }}>
                      {p.stock_estimado} {p.unidad_medida || 'unid'}
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => agregarAlCarrito(p)} style={btnSmall}>➕ Agregar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={seccionStyle}>
          <h3>📝 Detalle de Venta Actual</h3>
          <div style={carritoContainer}>
            {carrito.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <p style={{ fontSize: '1.2em' }}>Carrito vacío</p>
                <small>Selecciona productos de la izquierda</small>
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.9em', color: '#666' }}>
                    <th>Item</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map(item => (
                    <tr key={item.id}>
                      <td style={{ ...tdStyle, fontSize: '0.9em' }}>{item.nombre}</td>
                      <td style={tdStyle}>
                        <input type="number" style={inputTable} value={item.cantidad_vender}
                          onChange={(e) => actualizarCantidadCarrito(item.id, e.target.value)} />
                      </td>
                      <td style={tdStyle}>
                        <input type="number" style={{ ...inputTable, width: '80px' }} value={item.precio_unitario}
                          onChange={(e) => actualizarPrecioCarrito(item.id, e.target.value)} />
                      </td>
                      <td style={tdStyle}>${(item.cantidad_vender * item.precio_unitario).toLocaleString()}</td>
                      <td style={tdStyle}>
                        <button onClick={() => quitarDelCarrito(item.id)} style={btnDelete}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={footerVenta}>
            <div>
              <p style={{ margin: 0, color: '#666' }}>Total a pagar:</p>
              <h2 style={{ margin: 0, color: '#007bff' }}>${totalVenta.toLocaleString()}</h2>
            </div>
            <button
              onClick={handleVender}
              disabled={carrito.length === 0}
              style={{ ...btnVender, opacity: carrito.length === 0 ? 0.6 : 1 }}
            >
              🚀 FINALIZAR VENTA
            </button>
          </div>

          {mensaje.texto && (
            <div style={{
              marginTop: '15px', padding: '10px', borderRadius: '5px', textAlign: 'center',
              backgroundColor: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da',
              color: mensaje.tipo === 'success' ? '#155724' : '#721c24'
            }}>
              {mensaje.texto}
            </div>
          )}
        </section>
      </div>

      <section style={{ ...seccionStyle, marginTop: '30px' }}>
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>📋 Historial de Ventas Realizadas</h3>

        {errorHistorial ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#856404', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
            ⚠️ El historial de ventas no está disponible en este momento. El microservicio de ventas puede estar en mantenimiento.
            <br />
            <button onClick={cargarDatos} style={{ marginTop: '10px', padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #856404', backgroundColor: 'transparent', color: '#856404' }}>
              🔄 Reintentar
            </button>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ ...headerTable, backgroundColor: '#333', color: 'white' }}>
                <th style={thStyle}>ID Venta</th>
                <th style={thStyle}>Fecha y Hora</th>
                <th style={thStyle}>Productos Vendidos</th>
                <th style={thStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {historialAgrupado.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    No hay ventas registradas hoy.
                  </td>
                </tr>
              ) : historialAgrupado.map(v => (
                <tr key={v.id} style={trHover}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 'bold' }}>
                    #{v.id?.toString().slice(-6)}
                  </td>
                  <td style={tdStyle}>{v.fecha_hora ? new Date(v.fecha_hora).toLocaleString() : '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {v.items.map((it, idx) => (
                        <span key={idx} style={badgeItem}>{it}</span>
                      ))}
                    </div>
                  </td>
                  <td style={tdStyle}><strong>${Number(v.monto_total || 0).toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const seccionStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };
const headerTable = { backgroundColor: '#f8f9fa', textAlign: 'left' };
const thStyle = { padding: '12px', borderBottom: '2px solid #dee2e6' };
const tdStyle = { padding: '12px', borderBottom: '1px solid #eee' };
const trHover = { transition: 'background 0.2s' };
const inputSearch = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const inputTable = { width: '50px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc' };
const btnSmall = { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' };
const btnDelete = { backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' };
const btnVender = { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em' };
const footerVenta = { marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #eee', paddingTop: '20px' };
const carritoContainer = { minHeight: '250px' };
const badgeItem = { backgroundColor: '#e9ecef', padding: '3px 8px', borderRadius: '12px', fontSize: '0.85em', color: '#495057', border: '1px solid #dee2e6' };