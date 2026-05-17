import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getInventoryService } from '../services/inventoryService';
import { registrarVentaService, getHistorialVentasService } from '../services/salesService';

/* ── Subcomponentes ── */

const Spinner = ({ size = 'w-8 h-8', color = 'text-orange-500' }) => (
  <svg className={`animate-spin ${size} ${color}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Íconos (Color Naranja) ── */
const IconBuscar = () => (
  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconCarrito = ({ className = "w-4 h-4 text-orange-500" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconMas = () => (
  <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconVenta = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const IconRefresh = () => (
  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

/* ── Componente principal ── */

export default function Ventas() {
  const { user } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [errorHistorial, setErrorHistorial] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const LIMITE = 7;

  useEffect(() => { cargarDatos(pagina); }, [pagina]);

  const cargarDatos = async (paginaActual = 1) => {
    setCargando(true);
    try {
      const inv = await getInventoryService();
      setProductos(inv.productos || inv || []);
    } catch (err) {
      setMensaje({ texto: 'Error al cargar el inventario', tipo: 'error' });
    }
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const filtros = user?.rol === 'administrador'
        ? { page: paginaActual, limit: LIMITE }
        : { fecha_inicio: hoy, fecha_fin: hoy, page: paginaActual, limit: LIMITE };
      const hist = await getHistorialVentasService(filtros);
      setHistorial(hist.datos || hist || []);
      if (hist.paginacion) {
        const total = hist.paginacion.total || 0;
        setTotalPaginas(Math.max(1, Math.ceil(total / LIMITE)));
      }
      setErrorHistorial(false);
    } catch (err) {
      setErrorHistorial(true);
      setHistorial([]);
    } finally {
      setCargando(false);
    }
  };

  const agregarAlCarrito = (prod) => {
    const existe = carrito.find(item => item.id === prod.id);
    if (existe) {
      setCarrito(carrito.map(item =>
        item.id === prod.id ? { ...item, cantidad_vender: item.cantidad_vender + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...prod, cantidad_vender: 1, precio_unitario: Number(prod.precio_unitario ?? 0) }]);
    }
  };

  const actualizarCantidadCarrito = (id, valor) => {
    const num = Math.max(1, Number(valor));
    setCarrito(carrito.map(item => item.id === id ? { ...item, cantidad_vender: num } : item));
  };

  const quitarDelCarrito = (id) => setCarrito(carrito.filter(item => item.id !== id));

  const totalVenta = carrito.reduce((acc, item) => acc + (item.cantidad_vender * item.precio_unitario), 0);

  const handleVender = async () => {
    if (carrito.length === 0) return;
    const sinStock = carrito.find(item => item.cantidad_vender > item.stock_estimado);
    if (sinStock) {
      if (!window.confirm(`Estás vendiendo más del stock disponible de "${sinStock.nombre}". ¿Deseas continuar?`)) return;
    }
    setProcesando(true);
    try {
      const mapaPrecios = new Map(
        productos.map((p) => [Number(p.id), Number(p.precio_unitario ?? 0)])
      );
      const itemsVenta = carrito.map((item) => {
        const precioFijo = mapaPrecios.get(Number(item.id)) ?? Number(item.precio_unitario ?? 0);
        return {
          producto_id: item.id,
          nombre_producto: item.nombre,
          cantidad: item.cantidad_vender,
          precio_unitario: precioFijo,
        };
      });

      await registrarVentaService({ items: itemsVenta });
      setMensaje({ texto: '¡Venta realizada con éxito!', tipo: 'success' });
      setCarrito([]);
      setPagina(1);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const historialAgrupado = Object.values(
    (Array.isArray(historial) ? historial : []).reduce((acc, current) => {
      if (!acc[current.id]) acc[current.id] = { ...current, items: [] };
      if (current.nombre_producto) {
        acc[current.id].items.push(`${current.nombre_producto} (x${current.cantidad})`);
      }
      return acc;
    }, {})
  );

  const totalHoy = historialAgrupado.reduce((acc, v) => acc + Number(v.monto_total || 0), 0);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Registra ventas y consulta el historial de MAXIPAN
            </p>
          </div>
          {carrito.length > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2">
              <IconCarrito className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">
                {carrito.length} producto{carrito.length !== 1 ? 's' : ''} en carrito
              </span>
            </div>
          )}
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Productos', value: productos.length, bg: 'bg-orange-50 border-orange-100' },
            { label: 'En carrito', value: carrito.length, bg: 'bg-blue-50 border-blue-100' },
            { label: user?.rol === 'administrador' ? 'Total ventas' : 'Ventas hoy', value: historialAgrupado.length, bg: 'bg-green-50 border-green-100' },
            { label: 'Total del día', value: `$${totalHoy.toLocaleString('es-CO')}`, bg: 'bg-yellow-50 border-yellow-100', small: true },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl border p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                  <p className={`font-bold text-gray-900 mt-1 ${stat.small ? 'text-xl' : 'text-3xl'}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Catálogo de productos */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-orange-600 px-6 py-5">
              <h2 className="text-base font-semibold text-white">Catálogo de Productos</h2>
              <p className="text-orange-100 text-xs mt-0.5">Selecciona para agregar al carrito</p>
            </div>

            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <IconBuscar />
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 mb-1">{productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}</p>
            </div>

            {cargando ? (
              <div className="py-16 text-center">
                <Spinner size="w-8 h-8 mx-auto" />
                <p className="text-sm text-gray-500 mt-3">Cargando productos...</p>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-500">No se encontraron productos</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0">
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productosFiltrados.map(p => {
                      const stockBajo = p.stock_estimado <= 5;
                      const enCarrito = carrito.find(c => c.id === p.id);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{p.nombre}</span>
                              {enCarrito && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                  ×{enCarrito.cantidad_vender}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`text-sm font-semibold ${stockBajo ? 'text-red-600' : 'text-green-600'}`}>
                              {p.stock_estimado ?? 0}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">{p.unidad_medida || 'unid'}</span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <button
                              onClick={() => agregarAlCarrito(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-sm active:scale-95 bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                            >
                              <IconMas />
                              Agregar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Carrito */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-6 py-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <IconCarrito className="w-4 h-4 text-orange-500" />
                Detalle de Venta Actual
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">Revisa cantidades antes de finalizar</p>
            </div>

            {mensaje.texto && (
              <div className={[
                'mx-6 mt-4 flex items-start gap-3 rounded-xl px-4 py-3 text-sm',
                mensaje.tipo === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700',
              ].join(' ')}>
                <p>{mensaje.texto}</p>
              </div>
            )}

            {carrito.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
                <p className="text-gray-500 text-sm font-medium">Carrito vacío</p>
                <p className="text-gray-400 text-xs mt-1">Agrega productos desde el catálogo</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {carrito.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">{item.nombre}</span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad_vender}
                            onChange={e => actualizarCantidadCarrito(item.id, e.target.value)}
                            className="w-16 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-gray-800">
                            ${Number(item.precio_unitario || 0).toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900">
                            ${(item.cantidad_vender * item.precio_unitario).toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => quitarDelCarrito(item.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-all active:scale-95"
                          >
                            <IconTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 mt-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total a pagar</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    ${totalVenta.toLocaleString('es-CO')}
                  </p>
                </div>
                <button
                  onClick={handleVender}
                  disabled={carrito.length === 0 || procesando}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {procesando ? (
                    <>
                      <Spinner size="w-4 h-4" color="text-white" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <IconVenta />
                      Finalizar Venta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de ventas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Historial de Ventas</h2>
              <p className="text-xs text-gray-400 mt-0.5">{user?.rol === 'administrador' ? 'Historial completo de ventas' : 'Ventas registradas del día'}</p>
            </div>
            <button
              onClick={cargarDatos}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
            >
              <IconRefresh />
              Actualizar
            </button>
          </div>

          {errorHistorial ? (
            <div className="m-6 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-yellow-800">Historial no disponible</p>
                <p className="text-xs text-yellow-700 mt-0.5">El microservicio de ventas puede estar en mantenimiento.</p>
                <button
                  onClick={cargarDatos}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-all"
                >
                  <IconRefresh />
                  Reintentar
                </button>
              </div>
            </div>
          ) : cargando ? (
            <div className="py-12 text-center">
              <Spinner size="w-8 h-8 mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Cargando historial...</p>
            </div>
          ) : historialAgrupado.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-gray-500">{user?.rol === 'administrador' ? 'No hay ventas registradas' : 'No hay ventas registradas hoy'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Venta</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Productos</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historialAgrupado.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-bold text-gray-500">
                            #{v.id?.toString().slice(-6)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {v.fecha_hora ? new Date(v.fecha_hora).toLocaleString('es-CO') : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {v.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                              >
                                {it}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-green-700">
                            ${Number(v.monto_total || 0).toLocaleString('es-CO')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-500">
                  {historialAgrupado.length} ventas registradas{user?.rol !== 'administrador' ? ' hoy' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-700 mr-2">
                    Total{user?.rol !== 'administrador' ? ' del día' : ''}: <span className="text-green-700">${totalHoy.toLocaleString('es-CO')}</span>
                  </p>
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-bold"
                  >‹</button>
                  <span className="text-xs text-gray-600 font-medium px-1">{pagina} / {totalPaginas}</span>
                  <button
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-bold"
                  >›</button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}