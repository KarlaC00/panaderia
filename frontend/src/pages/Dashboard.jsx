// ─────────────────────────────────────────────────────────────
//  Dashboard.jsx  –  Panel de Monitoreo Maxipan
//  UBICACIÓN: frontend/src/pages/Dashboard.jsx
//
//  Requerimientos cubiertos:
//    REQ-D01  Stock actual en tiempo real (polling 30s)
//    REQ-D02  Resumen de ventas del día (transacciones, top productos, valor total)
//    REQ-D03  Resumen de ventas de la semana en curso
//    REQ-D04  Alertas activas: stock bajo + lotes próximos a vencer
//    REQ-D05  Actualización sin recarga (polling automático)
//    REQ-D06  Diseño responsivo
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
  getHistorialVentasService,
} from '../services/salesService';

// ── Constantes ────────────────────────────────────────────────
const POLL_INTERVAL = 30_000; // 30 segundos

// ── Utilidades ────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtNum = (n) =>
  new Intl.NumberFormat('es-CO').format(n ?? 0);

const today = () => {
  const d = new Date();
  return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const diasHastaVencer = (fechaVencimiento) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento);
  vence.setHours(0, 0, 0, 0);
  return Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
};

// ── Componente de estado de carga / error ─────────────────────
function Skeleton({ h = 'h-6', w = 'w-full' }) {
  return (
    <div className={`${h} ${w} bg-orange-100 rounded-lg animate-pulse`} />
  );
}

// ── Tarjeta KPI ───────────────────────────────────────────────
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
        <span className={`text-2xl ${c.icon}`}>{icon}</span>
        {sub && <span className="text-xs text-gray-400 font-medium">{sub}</span>}
      </div>
      {loading ? (
        <Skeleton h="h-8" w="w-3/4" />
      ) : (
        <p className={`text-2xl font-bold ${c.value} leading-none`}>{value}</p>
      )}
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );
}

// ── Badge de estado de stock ──────────────────────────────────
function StockBadge({ stock, minimo }) {
  if (stock <= 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Sin stock</span>;
  if (stock <= minimo)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Bajo mínimo</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Normal</span>;
}

// ── Barra de progreso de stock ────────────────────────────────
function StockBar({ stock, minimo, maximo = null }) {
  const cap = maximo || Math.max(stock, minimo) * 2 || 1;
  const pct = Math.min(100, (stock / cap) * 100);
  const isLow = stock <= minimo;
  const isEmpty = stock <= 0;
  const color = isEmpty ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Chip de alerta ────────────────────────────────────────────
function AlertaItem({ tipo, nombre, detalle, critica }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        critica
          ? 'bg-red-50 border-red-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      <span className="text-xl flex-shrink-0">{tipo === 'stock' ? '📦' : '⏰'}</span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${critica ? 'text-red-800' : 'text-amber-800'} truncate`}>
          {nombre}
        </p>
        <p className={`text-xs ${critica ? 'text-red-600' : 'text-amber-600'}`}>{detalle}</p>
      </div>
      {critica && (
        <span className="ml-auto flex-shrink-0 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
          Crítico
        </span>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Dashboard() {
  const { user } = useContext(AuthContext);

  // Estado
  const [resumen, setResumen]       = useState(null);
  const [historial, setHistorial]   = useState([]);
  const [inventario, setInventario] = useState([]);
  const [alertas, setAlertas]       = useState([]);
  const [lotes, setLotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── Fetch de datos ──────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [resData, histData, invData, alertData, lotesData] = await Promise.allSettled([
        getResumenVentasService(),
        getHistorialVentasService(),
        getInventoryService(),
        getAlertasService(),
        getLotesService(),
      ]);

      if (resData.status   === 'fulfilled') setResumen(resData.value);
      if (histData.status  === 'fulfilled') setHistorial(Array.isArray(histData.value) ? histData.value : histData.value?.ventas ?? []);
      if (invData.status   === 'fulfilled') setInventario(Array.isArray(invData.value) ? invData.value : invData.value?.items ?? []);
      if (alertData.status === 'fulfilled') setAlertas(Array.isArray(alertData.value) ? alertData.value : alertData.value?.alertas ?? []);
      if (lotesData.status === 'fulfilled') setLotes(Array.isArray(lotesData.value) ? lotesData.value : lotesData.value?.lotes ?? []);

      setLastUpdate(new Date());
    } catch (e) {
      setError('No se pudo conectar con los servicios. Reintentando…');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Polling — REQ-D05
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Derivados ───────────────────────────────────────────────

  // Ventas del día
  const hoy = new Date().toDateString();
  const ventasHoy = historial.filter(v => new Date(v.fecha || v.created_at).toDateString() === hoy);
  const totalHoy = ventasHoy.reduce((s, v) => s + Number(v.total ?? v.monto ?? 0), 0);

  // Ventas de la semana — REQ-D03
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  inicioSemana.setHours(0, 0, 0, 0);
  const ventasSemana = historial.filter(v => new Date(v.fecha || v.created_at) >= inicioSemana);
  const totalSemana  = ventasSemana.reduce((s, v) => s + Number(v.total ?? v.monto ?? 0), 0);

  // Top productos — REQ-D02
  const conteoProductos = {};
  ventasHoy.forEach(v => {
    const items = v.items ?? v.detalles ?? [];
    items.forEach(i => {
      const nombre = i.nombre_producto ?? i.nombre ?? i.producto ?? 'Desconocido';
      const cant   = Number(i.cantidad ?? 1);
      conteoProductos[nombre] = (conteoProductos[nombre] ?? 0) + cant;
    });
  });
  const topProductos = Object.entries(conteoProductos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Inventario bajo mínimo — REQ-D01 / D04
  const invCritico  = inventario.filter(i => Number(i.stock_actual ?? i.stock ?? 0) <= 0);
  const invBajo     = inventario.filter(i => {
    const s = Number(i.stock_actual ?? i.stock ?? 0);
    const m = Number(i.stock_minimo ?? i.minimo ?? 0);
    return s > 0 && s <= m;
  });

  // Lotes próximos a vencer (≤5 días) — REQ-I12 / D04
  const lotesAlerta = lotes.filter(l => {
    const dias = diasHastaVencer(l.fecha_vencimiento ?? l.vencimiento);
    return dias <= 5 && dias >= 0;
  });

  // Alertas combinadas — REQ-D04
  const alertasCombinadas = [
    ...alertas,
    ...invCritico.map(i => ({
      _tipo: 'stock',
      nombre: i.nombre,
      detalle: 'Sin stock disponible',
      critica: true,
    })),
    ...invBajo.map(i => ({
      _tipo: 'stock',
      nombre: i.nombre,
      detalle: `Stock ${i.stock_actual ?? i.stock} / mínimo ${i.stock_minimo ?? i.minimo} ${i.unidad ?? ''}`,
      critica: false,
    })),
    ...lotesAlerta.map(l => {
      const dias = diasHastaVencer(l.fecha_vencimiento ?? l.vencimiento);
      return {
        _tipo: 'vencimiento',
        nombre: l.nombre_insumo ?? l.insumo ?? l.nombre ?? `Lote ${l.numero_lote ?? l.id}`,
        detalle: dias === 0 ? 'Vence HOY' : `Vence en ${dias} día${dias !== 1 ? 's' : ''}`,
        critica: dias <= 1,
      };
    }),
  ];

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream, #FFFBF5)', fontFamily: 'var(--font-sans, system-ui)' }}>

      {/* ── Header ── */}
     

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
            <span className="text-xl"></span>
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => fetchAll()} className="ml-auto text-xs underline">Reintentar</button>
          </div>
        )}

        {/* ── KPIs REQ-D02 / D03 ── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Ventas</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon=""
              label="Ingresos hoy"
              value={fmt(totalHoy)}
              sub="Hoy"
              color="orange"
              loading={loading}
            />
            <KpiCard
              icon=""
              label="Transacciones hoy"
              value={fmtNum(resumen?.total_transacciones_hoy ?? ventasHoy.length)}
              sub="Hoy"
              color="green"
              loading={loading}
            />
            <KpiCard
              icon=""
              label="Ingresos semana"
              value={fmt(resumen?.total_semana ?? totalSemana)}
              sub="Esta semana"
              color="amber"
              loading={loading}
            />
            <KpiCard
              icon=""
              label="Pedidos semana"
              value={fmtNum(resumen?.transacciones_semana ?? ventasSemana.length)}
              sub="Esta semana"
              color={alertasCombinadas.length > 0 ? 'red' : 'green'}
              loading={loading}
            />
          </div>
        </section>

        {/* ── Fila intermedia: Alertas + Top Productos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Alertas activas — REQ-D04 */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <span></span> Alertas Activas
              </h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                alertasCombinadas.length === 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {alertasCombinadas.length === 0 ? 'Todo en orden' : `${alertasCombinadas.length} activas`}
              </span>
            </div>
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h="h-14" />)
              ) : alertasCombinadas.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <span className="text-4xl mb-2"></span>
                  <p className="text-sm font-medium">Sin alertas activas</p>
                  <p className="text-xs">Todo el inventario en niveles normales</p>
                </div>
              ) : (
                alertasCombinadas.map((a, i) => (
                  <AlertaItem
                    key={i}
                    tipo={a._tipo ?? a.tipo ?? 'stock'}
                    nombre={a.nombre ?? a.producto ?? 'Elemento'}
                    detalle={a.detalle ?? a.mensaje ?? ''}
                    critica={a.critica ?? false}
                  />
                ))
              )}
            </div>
          </section>

          {/* Top productos del día — REQ-D02 */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <span></span> Más Vendidos Hoy
              </h2>
              <span className="text-xs text-gray-400">Top 5</span>
            </div>
            <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h="h-10" />)
              ) : topProductos.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <span className="text-4xl mb-2"></span>
                  <p className="text-sm font-medium">Sin ventas registradas hoy</p>
                </div>
              ) : (
                topProductos.map(([nombre, cantidad], idx) => {
                  const max = topProductos[0][1];
                  return (
                    <div key={nombre} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === 0 ? 'bg-orange-500 text-white' :
                        idx === 1 ? 'bg-orange-200 text-orange-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{nombre}</span>
                          <span className="text-xs font-bold text-orange-600 ml-2 flex-shrink-0">{fmtNum(cantidad)} uds</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-orange-400 transition-all duration-700"
                            style={{ width: `${(cantidad / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* ── Estado del Inventario — REQ-D01 ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span></span> Estado del Inventario
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                {inventario.filter(i => Number(i.stock_actual ?? i.stock ?? 0) > Number(i.stock_minimo ?? i.minimo ?? 0)).length} normales
              </span>
              {invBajo.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {invBajo.length} bajos
                </span>
              )}
              {invCritico.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                  {invCritico.length} sin stock
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h="h-20" />)}
            </div>
          ) : inventario.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <span className="text-4xl mb-2"></span>
              <p className="text-sm font-medium">Sin registros de inventario</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {[...inventario]
                .sort((a, b) => {
                  const sa = Number(a.stock_actual ?? a.stock ?? 0);
                  const ma = Number(a.stock_minimo ?? a.minimo ?? 1);
                  const sb = Number(b.stock_actual ?? b.stock ?? 0);
                  const mb = Number(b.stock_minimo ?? b.minimo ?? 1);
                  // Primero los críticos, luego bajos, luego normales
                  const pa = sa <= 0 ? 0 : sa <= ma ? 1 : 2;
                  const pb = sb <= 0 ? 0 : sb <= mb ? 1 : 2;
                  return pa - pb;
                })
                .map(item => {
                  const stock  = Number(item.stock_actual ?? item.stock ?? 0);
                  const minimo = Number(item.stock_minimo ?? item.minimo ?? 0);
                  const tipo   = item.tipo ?? (item.es_insumo ? 'insumo' : 'producto');
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all hover:shadow-sm ${
                        stock <= 0
                          ? 'bg-red-50 border-red-200'
                          : stock <= minimo
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.nombre}</p>
                          <p className="text-xs text-gray-400 capitalize">{tipo}</p>
                        </div>
                        <StockBadge stock={stock} minimo={minimo} />
                      </div>
                      <StockBar stock={stock} minimo={minimo} />
                      <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                        <span>
                          <span className="font-bold text-gray-800">{fmtNum(stock)}</span>{' '}
                          {item.unidad_medida ?? item.unidad ?? 'uds'}
                        </span>
                        <span>mín. {fmtNum(minimo)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* ── Lotes próximos a vencer — REQ-D04 ── */}
        {(loading || lotesAlerta.length > 0) && (
          <section className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50">
              <h2 className="font-bold text-amber-800 flex items-center gap-2">
                <span>⏰</span> Lotes Próximos a Vencer
              </h2>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                ≤ 5 días
              </span>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} h="h-14" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lotesAlerta.map((l, i) => {
                    const dias = diasHastaVencer(l.fecha_vencimiento ?? l.vencimiento);
                    return (
                      <div
                        key={l.id ?? i}
                        className={`p-3 rounded-xl border ${
                          dias <= 1
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{dias <= 1 ? '🚨' : '⚠️'}</span>
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {l.nombre_insumo ?? l.insumo ?? l.nombre ?? `Lote ${l.numero_lote ?? l.id}`}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          Lote: <span className="font-medium">{l.numero_lote ?? l.id}</span>
                          {l.cantidad && (
                            <> · <span className="font-medium">{fmtNum(l.cantidad)} {l.unidad ?? 'uds'}</span></>
                          )}
                        </p>
                        <p className={`text-xs font-bold ${dias <= 1 ? 'text-red-600' : 'text-amber-600'}`}>
                          {dias === 0 ? '⚡ Vence HOY' : `Vence en ${dias} día${dias !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Footer de actualización ── */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">
            Actualización automática cada {POLL_INTERVAL / 1000}s · Sistema Maxipan v1.0
            {lastUpdate && (
              <> · Última actualización: {lastUpdate.toLocaleTimeString('es-CO')}</>
            )}
          </p>
        </div>

      </div>
    </div>
  );
}
