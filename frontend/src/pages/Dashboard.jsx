// ─────────────────────────────────────────────────────────────
//  Dashboard.jsx  –  Panel de Monitoreo Maxipan (Versión Orange SVG)
//  UBICACIÓN: frontend/src/pages/Dashboard.jsx
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getInventoryService,
  getAlertasService,
  getLotesService,
} from '../services/inventoryService';
import {
  getResumenVentasService,
} from '../services/salesService';

// ── Iconos SVG (Color Naranja Maxipan) ────────────────────────
const IconMoney = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
);
const IconCart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
);
const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);
const IconPackage = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
);
const IconAlert = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

// ── Utilidades ────────────────────────────────────────────────
const POLL_INTERVAL = 10_000;
const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat('es-CO').format(n ?? 0);
const diasHastaVencer = (fechaVencimiento) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento);
  vence.setHours(0, 0, 0, 0);
  return Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
};

// ── Sub-componentes Visuales ──────────────────────────────────
function Skeleton({ h = 'h-6', w = 'w-full' }) {
  return <div className={`${h} ${w} bg-orange-100 rounded-lg animate-pulse`} />;
}

function KpiCard({ icon, label, value, sub, color = 'orange', loading }) {
  const colors = {
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', value: 'text-orange-700' },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', value: 'text-emerald-700' },
    amber:  { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', value: 'text-amber-700' },
    red:    { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', value: 'text-red-700' },
  };
  const c = colors[color];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <span>{icon}</span>
        {sub && <span className="text-xs text-gray-400 font-medium tracking-tight">{sub}</span>}
      </div>
      {loading ? <Skeleton h="h-8" w="w-3/4" /> : <p className={`text-2xl font-bold ${c.value} leading-none`}>{value}</p>}
      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}

function AlertaItem({ _tipo, nombre, detalle, critica }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${critica ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-amber-50 border-amber-200'}`}>
      <span className={`flex-shrink-0 mt-0.5 ${critica ? 'text-red-500' : 'text-orange-500'}`}>
        {_tipo === 'stock' ? <IconAlert /> : <IconClock />}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${critica ? 'text-red-800' : 'text-orange-900'} truncate`}>{nombre}</p>
        <p className={`text-xs ${critica ? 'text-red-600' : 'text-orange-700'}`}>{detalle}</p>
      </div>
      {critica && <span className="ml-auto text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">Crítico</span>}
    </div>
  );
}

function StockBadge({ stock, minimo }) {
  if (stock <= 0) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 uppercase">Agotado</span>;
  if (stock <= minimo) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-700 uppercase">Reordenar</span>;
  return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 uppercase">Óptimo</span>;
}

function StockBar({ stock, minimo }) {
  const cap = Math.max(stock, minimo) * 1.5 || 1;
  const pct = Math.min(100, (stock / cap) * 100);
  const color = stock <= 0 ? 'bg-red-500' : stock <= minimo ? 'bg-orange-500' : 'bg-emerald-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full transition-all duration-700 ease-out ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────
export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [resumen, setResumen]       = useState(null);
  const [inventario, setInventario] = useState([]);
  const [alertas, setAlertas]       = useState([]);
  const [lotes, setLotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [resVentas, resInv, resAlertas, resLotes] = await Promise.allSettled([
        getResumenVentasService(),
        getInventoryService(),
        getAlertasService(),
        getLotesService(),
      ]);

      if (resVentas.status === 'fulfilled') setResumen(resVentas.value);
      if (resInv.status === 'fulfilled') {
        const prods = resInv.value?.productos ?? [];
        const insu = resInv.value?.insumos ?? [];
        const combined = [
          ...prods.map(p => ({ id: `p-${p.id}`, nombre: p.nombre, stock_actual: Number(p.stock_estimado ?? 0), stock_minimo: Number(p.stock_minimo ?? 0), unidad: p.unidad_medida, tipo: 'producto' })),
          ...insu.map(i => ({ id: `i-${i.id}`, nombre: i.nombre, stock_actual: Number(i.stock_actual ?? 0), stock_minimo: Number(i.stock_minimo ?? 0), unidad: i.unidad_medida, tipo: 'insumo' }))
        ];
        setInventario(combined);
      }
      if (resAlertas.status === 'fulfilled') setAlertas(Array.isArray(resAlertas.value) ? resAlertas.value : []);
      if (resLotes.status === 'fulfilled') setLotes(Array.isArray(resLotes.value) ? resLotes.value : []);

      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError('Sincronización interrumpida.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  const kpis = {
    hoyTotal: Number(resumen?.hoy?.total ?? 0),
    hoyTrans: Number(resumen?.hoy?.transacciones ?? 0),
    semTotal: Number(resumen?.semana?.total ?? 0),
    semTrans: Number(resumen?.semana?.transacciones ?? 0),
  };

  const topProductos = (resumen?.topProductos ?? []).slice(0, 5);

  const alertasCombinadas = [
    ...alertas.map(a => ({ _tipo: 'stock', nombre: a.producto || a.insumo || 'Stock bajo', detalle: `Nivel actual: ${a.stock_al_momento}`, critica: a.stock_al_momento <= 0 })),
    ...lotes.filter(l => {
      const d = diasHastaVencer(l.fecha_vencimiento);
      return d >= 0 && d <= 5;
    }).map(l => ({ _tipo: 'vencimiento', nombre: l.nombre_insumo || `Lote ${l.numero_lote}`, detalle: `Expira en ${diasHastaVencer(l.fecha_vencimiento)} días`, critica: diasHastaVencer(l.fecha_vencimiento) <= 1 }))
  ];

  return (
    <div className="min-h-screen p-4 sm:p-8 space-y-8" style={{ backgroundColor: '#FFFCF8' }}>
      
      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl text-sm font-bold uppercase tracking-tight">{error}</div>}

      {/* KPIs Principales */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={<IconMoney />} label="Ventas Hoy" value={fmt(kpis.hoyTotal)} color="orange" loading={loading} />
        <KpiCard icon={<IconCart />} label="Pedidos Hoy" value={fmtNum(kpis.hoyTrans)} color="green" loading={loading} />
        <KpiCard icon={<IconChart />} label="Semana Actual" value={fmt(kpis.semTotal)} color="amber" loading={loading} />
        <KpiCard icon={<IconPackage />} label="Pedidos Semana" value={fmtNum(kpis.semTrans)} color="green" loading={loading} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel de Alertas */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-black text-gray-800 mb-5 flex justify-between items-center uppercase tracking-widest text-sm">
            Notificaciones Críticas
            <span className="bg-orange-500 text-white text-[10px] px-2.5 py-1 rounded-full">{alertasCombinadas.length}</span>
          </h2>
          <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {alertasCombinadas.length > 0 ? (
              alertasCombinadas.map((a, i) => <AlertaItem key={i} {...a} />)
            ) : (
              <div className="text-center py-12 flex flex-col items-center">
                <IconCheck />
                <p className="text-gray-400 text-xs font-bold mt-4 uppercase tracking-widest">Sistemas en orden</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Ventas */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-black text-gray-800 mb-5 uppercase tracking-widest text-sm">Rendimiento de Productos</h2>
          <div className="space-y-5">
            {topProductos.map((p, i) => (
              <div key={i} className="group">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-black text-gray-400 mr-2">{i+1}</span>
                  <span className="font-bold text-gray-700 flex-1 truncate">{p.nombre_producto}</span>
                  <span className="text-orange-600 font-black ml-4">{p.total_vendido} <small className="text-[10px]">UND</small></span>
                </div>
                <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full group-hover:bg-orange-400 transition-all duration-1000" style={{ width: `${(p.total_vendido / (topProductos[0]?.total_vendido || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monitor de Inventario */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-black text-gray-800 uppercase tracking-widest text-sm">Estado de Stock e Insumos</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
              LIVE: {lastUpdate?.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[500px] overflow-y-auto custom-scrollbar">
          {inventario.map(item => (
            <div key={item.id} className={`p-5 rounded-2xl border transition-all hover:border-orange-200 ${item.stock_actual <= item.stock_minimo ? 'bg-orange-50/30 border-orange-100' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-gray-800 truncate leading-tight">{item.nombre}</h3>
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{item.tipo}</span>
                </div>
                <StockBadge stock={item.stock_actual} minimo={item.stock_minimo} />
              </div>
              <StockBar stock={item.stock_actual} minimo={item.stock_minimo} />
              <div className="flex justify-between mt-3">
                <span className="text-sm font-black text-gray-800">{fmtNum(item.stock_actual)} <small className="text-gray-400 text-[10px]">{item.unidad}</small></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase pt-1">Mín: {item.stock_minimo}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center">
        <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
          Maxipan Control Hub • 2026 • v1.2
        </span>
      </footer>
    </div>
  );
}