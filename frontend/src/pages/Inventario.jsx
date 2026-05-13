import { useState, useEffect, useCallback } from 'react';
import RegistrarLote from '../components/RegistrarLote';
import GestionRecetas from '../components/GestionRecetas';
import {
  getInventoryService,
  createProductService,
  createInsumoService,
  deleteItemService,
  getLotesService,
  getMovimientosService,
  getAlertasService,
} from '../services/inventoryService';

/* ── Subcomponentes ── */

const Spinner = ({ size = 'w-8 h-8', color = 'text-brand-400' }) => (
  <svg className={`animate-spin ${size} ${color}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const InputField = ({ label, icon, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
      )}
      <input
        {...props}
        className={[
          'w-full pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white transition-all',
          icon ? 'pl-10' : 'pl-4',
        ].join(' ')}
      />
    </div>
  </div>
);

const SelectField = ({ label, children, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <select
      {...props}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white transition-all"
    >
      {children}
    </select>
  </div>
);

/* ── Íconos SVG Naranjas ── */
const IconCaja = () => (
  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const IconRuler = () => (
  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
  </svg>
);

const IconAlerta = () => (
  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconMas = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconReceta = () => (
  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const IconHistorial = () => (
  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconBuscar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconCheck = () => (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const IconPan = () => (
  <svg 
    className="w-8 h-8 text-orange-600" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={1.5} 
      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0-.621.504 1.125 1.125 1.125z" 
    />
  </svg>
);

const IconTrigo = () => (
  <svg 
    className="w-8 h-8 text-orange-600" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={1.5} 
      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12 1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" 
    />
  </svg>
);

/* ── Componente principal ── */

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [tab, setTab] = useState('productos');
  const [showForm, setShowForm] = useState(false);
  const [showRecetaForm, setShowRecetaForm] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [newData, setNewData] = useState({
    nombre: '',
    unidad_medida: 'unidades',
    stock_minimo: 0,
    precio_unitario: '',
  });

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [invData, lotesData, alertasData] = await Promise.all([
        getInventoryService(true),
        getLotesService(),
        getAlertasService(),
      ]);

      setProductos(invData?.productos || []);
      setInsumos(invData?.insumos || []);
      setLotes(Array.isArray(lotesData) ? lotesData : []);
      setAlertas(Array.isArray(alertasData) ? alertasData : []);

      if (tab === 'historial') {
        const movData = await getMovimientosService();
        setMovimientos(Array.isArray(movData) ? movData : []);
      }
    } catch (err) {
      console.error('Error al cargar datos', err);
      setMensaje({ texto: 'Error al conectar con el servidor', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  }, [tab]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (tab === 'productos') {
        const precio = Number(newData.precio_unitario);
        if (!Number.isFinite(precio) || precio < 0) {
          setMensaje({ texto: 'Debes ingresar un precio unitario valido para el producto', tipo: 'error' });
          return;
        }
        await createProductService({
          ...newData,
          precio_unitario: precio,
        });
      } else {
        await createInsumoService(newData);
      }
      setMensaje({ texto: 'Registrado con éxito', tipo: 'success' });
      setShowForm(false);
      setNewData({ nombre: '', unidad_medida: 'unidades', stock_minimo: 0, precio_unitario: '' });
      cargarDatos();
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    }
  };

  const handleDelete = async (id, tipo) => {
    if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return;
    try {
      const res = await deleteItemService(id, tipo);
      setMensaje({ texto: res.mensaje || 'Eliminado correctamente', tipo: 'success' });
      cargarDatos();
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    }
  };

  const alertasVencimiento = lotes.filter(l => l.estado === 'por_vencer' || l.estado === 'vencido');
  const alertasStockBajo   = alertas.filter(a => a.tipo === 'stock_bajo');
  const alertasLoteBD      = alertas.filter(a => a.tipo === 'lote_por_vencer');
  const totalAlertas = alertasVencimiento.length + alertasStockBajo.length + alertasLoteBD.length;

  const listaActual = tab === 'productos' ? productos : insumos;
  const listaFiltrada = listaActual.filter(item =>
    item.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );
  const stockBajoCount = listaActual.filter(item => {
    const stock = Number(tab === 'productos' ? (item.stock_estimado ?? 0) : (item.stock_actual ?? 0));
    const minimo = Number(item.stock_minimo ?? 0);
    return stock <= minimo;
  }).length;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Inventario</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestiona productos, insumos, lotes y movimientos de MAXIPAN
            </p>
          </div>
          {totalAlertas > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              <span className="text-red-500"><IconAlerta /></span>
              <span className="text-sm font-semibold text-red-700">
                {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''} activa{totalAlertas !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Productos',  value: productos.length, icon: <IconPan />, bg: 'bg-brand-50 border-brand-100'    },
            { label: 'Insumos',    value: insumos.length,   icon: <IconTrigo />, bg: 'bg-blue-50 border-blue-100'      },
            { label: 'Stock bajo', value: stockBajoCount,   icon: <IconAlerta />, bg: 'bg-yellow-50 border-yellow-100'  },
            { label: 'Alertas',    value: totalAlertas,     icon: <IconAlerta />, bg: 'bg-red-50 border-red-100'        },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl border p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <span>{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Columna izquierda ── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Formulario nuevo ítem */}
            {tab !== 'historial' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-brand-600 px-6 py-5">
                  <h2 className="text-base font-semibold text-white">
                    {tab === 'productos' ? 'Nuevo Producto' : 'Nuevo Insumo'}
                  </h2>
                  <p className="text-brand-200 text-xs mt-0.5">Completa el formulario para registrar</p>
                </div>

                <div className="p-6 space-y-4">
                  {/* Mensaje */}
                  {mensaje.texto && (
                    <div className={[
                      'flex items-start gap-3 rounded-xl px-4 py-3 text-sm',
                      mensaje.tipo === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-green-50 border border-green-200 text-green-700',
                    ].join(' ')}>
                      <span className="shrink-0">{mensaje.tipo === 'error' ? <IconAlerta /> : <IconCheck />}</span>
                      <p>{mensaje.texto}</p>
                    </div>
                  )}

                  {!showForm ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => { setShowForm(true); setShowRecetaForm(false); setMensaje({ texto: '', tipo: '' }); }}
                        className="w-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <IconMas />
                        {tab === 'productos' ? 'Agregar Producto' : 'Agregar Insumo'}
                      </button>
                      <button
                        onClick={() => { setShowRecetaForm(!showRecetaForm); setShowForm(false); }}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <IconReceta />
                        {showRecetaForm ? 'Cerrar Recetas' : 'Configurar Recetas'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                      <InputField
                        label="Nombre"
                        type="text"
                        placeholder={tab === 'productos' ? 'Ej. Pan de queso' : 'Ej. Harina de trigo'}
                        value={newData.nombre}
                        onChange={e => setNewData({ ...newData, nombre: e.target.value })}
                        required
                        icon={<IconCaja />}
                      />
                      <SelectField
                        label="Unidad de medida"
                        value={newData.unidad_medida}
                        onChange={e => setNewData({ ...newData, unidad_medida: e.target.value })}
                      >
                        <option value="unidades">Unidades</option>
                        <option value="kg">Kilogramos (kg)</option>
                        <option value="gr">Gramos (gr)</option>
                        <option value="litros">Litros</option>
                      </SelectField>
                      <InputField
                        label="Stock mínimo"
                        type="number"
                        placeholder="0"
                        value={newData.stock_minimo}
                        onChange={e => setNewData({ ...newData, stock_minimo: e.target.value })}
                        icon={<IconRuler />}
                      />
                      {tab === 'productos' && (
                        <InputField
                          label="Precio unitario"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={newData.precio_unitario}
                          onChange={e => setNewData({ ...newData, precio_unitario: e.target.value })}
                          required
                        />
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Recetas */}
            {showRecetaForm && tab !== 'historial' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-700 px-6 py-4">
                  <h2 className="text-base font-semibold text-white">Configurar Recetas</h2>
                </div>
                <div className="p-4">
                  <GestionRecetas productos={productos} insumos={insumos} onRecetaCreada={cargarDatos} />
                </div>
              </div>
            )}

            {/* Panel de alertas */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${totalAlertas > 0 ? 'bg-red-50' : ''}`}>
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <IconAlerta />
                  Alertas
                </h2>
                {totalAlertas > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
                    {totalAlertas}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                {alertasStockBajo.map(a => (
                  <div key={a.id} className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-xl p-3">
                    <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                        <IconAlerta /> Stock bajo mínimo
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{a.insumo || 'Insumo desconocido'}</p>
                    <p className="text-xs text-red-600 mt-1">Stock actual: <strong>{a.stock_al_momento}</strong></p>
                  </div>
                ))}

                {alertasLoteBD.map(a => (
                  <div key={a.id} className="bg-yellow-50 border border-yellow-200 border-l-4 border-l-yellow-500 rounded-xl p-3">
                    <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1">
                        <IconHistorial /> Lote por vencer
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{a.insumo || 'Insumo desconocido'}</p>
                  </div>
                ))}

                {alertasVencimiento.map(l => (
                  <div key={l.id} className={[
                    'rounded-xl p-3 border-l-4',
                    l.estado === 'vencido'
                      ? 'bg-red-50 border border-red-200 border-l-red-500'
                      : 'bg-yellow-50 border border-yellow-200 border-l-yellow-500',
                  ].join(' ')}>
                    <p className={`text-xs font-semibold ${l.estado === 'vencido' ? 'text-red-700' : 'text-yellow-700'} flex items-center gap-1`}>
                      {l.estado === 'vencido' ? <IconAlerta /> : <IconHistorial />}
                      {l.estado === 'vencido' ? 'VENCIDO' : 'Por vencer'}
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{l.insumo || 'Insumo desconocido'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lote: {l.numero_lote || 'S/N'}
                      {l.estado !== 'vencido' && ` · Vence en ${l.dias_para_vencer} días`}
                    </p>
                  </div>
                ))}

                {totalAlertas === 0 && (
                  <div className="py-6 text-center flex flex-col items-center">
                    <IconCheck />
                    <p className="text-sm text-gray-500 mt-2">Sin alertas activas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Registrar Lote */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-green-600 px-6 py-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <IconCaja /> Entrada de Mercancía
                </h2>
                <p className="text-green-200 text-xs mt-0.5">Registro de nuevo lote</p>
              </div>
              <div className="p-4">
                <RegistrarLote insumos={insumos} onLoteRegistrado={cargarDatos} />
              </div>
            </div>

          </div>

          {/* ── Columna derecha: tabla principal ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Tabs + búsqueda */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {[
                      { key: 'productos', label: 'Productos', icon: <IconPan /> },
                      { key: 'insumos',   label: 'Insumos',   icon: <IconTrigo /> },
                      { key: 'historial', label: 'Historial', icon: <IconHistorial /> },
                    ].map(t => (
                      <button
                        key={t.key}
                        onClick={() => { setTab(t.key); setBusqueda(''); setShowForm(false); }}
                        className={[
                          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          tab === t.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700',
                        ].join(' ')}
                      >
                        <span className="scale-75">{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {tab !== 'historial' && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <IconBuscar />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all w-full sm:w-48"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Cargando */}
              {cargando && (
                <div className="py-16 text-center">
                  <Spinner size="w-8 h-8 mx-auto" />
                  <p className="text-sm text-gray-500 mt-3">Cargando datos...</p>
                </div>
              )}

              {/* ── Tabla productos / insumos ── */}
              {!cargando && tab !== 'historial' && (
                <>
                  {listaFiltrada.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center">
                      <div className="mb-3 opacity-20">
                         {tab === 'productos' ? <IconPan /> : <IconTrigo />}
                      </div>
                      <p className="text-gray-500 text-sm">
                        {busqueda ? 'No se encontraron resultados' : `No hay ${tab} registrados`}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Stock {tab === 'productos' ? 'Estimado' : 'Actual'}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mínimo</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {listaFiltrada.map(item => {
                            const stockActual = Number(
                              tab === 'productos'
                                ? (item.stock_estimado ?? 0)
                                : (item.stock_actual ?? 0)
                            );
                            const minimo = Number(item.stock_minimo ?? 0);
                            const enMinimo = stockActual <= minimo;
                            return (
                              <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${enMinimo ? 'bg-yellow-50/40' : ''}`}>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-gray-900">{item.nombre}</span>
                                    {enMinimo && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        ⚠ Stock bajo
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5">{item.unidad_medida || 'unidades'}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-sm font-bold ${enMinimo ? 'text-red-600' : 'text-green-600'}`}>
                                    {Number(stockActual).toLocaleString('es-CO')}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-1">{item.unidad_medida?.toLowerCase() || 'unid'}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-600">
                                    {minimo.toLocaleString('es-CO')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => handleDelete(item.id, tab === 'productos' ? 'producto' : 'insumo')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-sm active:scale-95 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                  >
                                    <IconTrash />
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {listaFiltrada.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-500">
                        Mostrando {listaFiltrada.length} de {listaActual.length} {tab}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Historial ── */}
              {!cargando && tab === 'historial' && (
                <>
                  {movimientos.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center">
                      <div className="opacity-20 mb-3"><IconHistorial /></div>
                      <p className="text-gray-500 text-sm">No hay movimientos registrados</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Insumo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {movimientos.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <IconHistorial />
                                  <span className="text-sm">
                                    {m.fecha_hora ? new Date(m.fecha_hora).toLocaleString('es-CO') : 'Fecha no disp.'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-medium text-gray-900">{m.insumo_nombre || 'N/A'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-blue-600">
                                  {Number(m.cantidad || 0).toLocaleString('es-CO')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {movimientos.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-500">{movimientos.length} movimientos en el historial</p>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}