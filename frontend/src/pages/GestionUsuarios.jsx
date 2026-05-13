import { useState, useEffect } from 'react';
import { createUserService, listUsersService, toggleUserStatusService } from '../services/userService';

/* ── Subcomponentes ── */

const RoleBadge = ({ rol }) => {
  const estilos = {
    administrador: 'bg-brand-100 text-brand-800 border-brand-200',
    empleado:      'bg-blue-50  text-blue-700  border-blue-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${estilos[rol] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {rol}
    </span>
  );
};

const StatusButton = ({ activo, onClick }) => (
  <button
    onClick={onClick}
    className={[
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-sm active:scale-95',
      activo
        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
        : 'bg-red-50   text-red-600   border-red-200   hover:bg-red-100',
    ].join(' ')}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-green-500' : 'bg-red-400'}`} />
    {activo ? 'Activo' : 'Inactivo'}
  </button>
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

const Spinner = ({ size = 'w-8 h-8', color = 'text-brand-400' }) => (
  <svg className={`animate-spin ${size} ${color}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Íconos reutilizables ── */

const IconUsuario = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconCorreo = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconCandado = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const IconBuscar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconMas = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

/* ── Colores de avatar por índice ── */
const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-blue-100  text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
];

const getInitials = (nombre) =>
  nombre
    ? nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

/* ── Componente principal ── */

export default function GestionUsuarios() {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    rol: 'empleado',
  });
  const [usuarios, setUsuarios]   = useState([]);
  const [mensaje, setMensaje]     = useState({ texto: '', tipo: '' });
  const [loading, setLoading]     = useState(false);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState('');

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const data = await listUsersService();
      setUsuarios(data);
    } catch (err) {
      console.error(err);
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    setLoading(true);
    try {
      await createUserService(formData);
      setMensaje({ texto: '¡Usuario creado con éxito!', tipo: 'success' });
      setFormData({ nombre: '', correo: '', contrasena: '', rol: 'empleado' });
      cargarUsuarios();
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, activo) => {
    try {
      await toggleUserStatusService(id, activo);
      cargarUsuarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const usuariosFiltrados = Array.isArray(usuarios)
    ? usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.correo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.rol?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  const totalActivos   = Array.isArray(usuarios) ? usuarios.filter(u => u.activo).length  : 0;
  const totalInactivos = Array.isArray(usuarios) ? usuarios.filter(u => !u.activo).length : 0;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Cabecera de página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Administra los usuarios y roles del sistema MAXIPAN
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Total:</span>
            <span className="text-sm font-bold text-gray-900">{usuarios.length} usuarios</span>
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total usuarios', value: usuarios.length, emoji: '👥', bg: 'bg-brand-50 border-brand-100' },
            { label: 'Activos',        value: totalActivos,    emoji: '✅', bg: 'bg-green-50 border-green-100' },
            { label: 'Inactivos',      value: totalInactivos,  emoji: '⛔', bg: 'bg-red-50   border-red-100'   },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl border p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.emoji}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Layout de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Columna izquierda: formulario de creación ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              <div className="bg-brand-600 px-6 py-5">
                <h2 className="text-base font-semibold text-white">Nuevo Usuario</h2>
                <p className="text-brand-200 text-xs mt-0.5">Completa el formulario para registrar</p>
              </div>

              <div className="p-6 space-y-4">

                {/* Mensaje de éxito / error */}
                {mensaje.texto && (
                  <div className={[
                    'flex items-start gap-3 rounded-xl px-4 py-3 text-sm',
                    mensaje.tipo === 'error'
                      ? 'bg-red-50   border border-red-200   text-red-700'
                      : 'bg-green-50 border border-green-200 text-green-700',
                  ].join(' ')}>
                    <span className="text-lg">{mensaje.tipo === 'error' ? '⚠️' : '✅'}</span>
                    <p>{mensaje.texto}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  <InputField
                    label="Nombre completo"
                    type="text"
                    placeholder="Ej. María García"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    icon={<IconUsuario />}
                  />

                  <InputField
                    label="Correo electrónico"
                    type="email"
                    placeholder="correo@maxipan.com"
                    value={formData.correo}
                    onChange={e => setFormData({ ...formData, correo: e.target.value })}
                    required
                    icon={<IconCorreo />}
                  />

                  <InputField
                    label="Contraseña temporal"
                    type="password"
                    placeholder="••••••••"
                    value={formData.contrasena}
                    onChange={e => setFormData({ ...formData, contrasena: e.target.value })}
                    required
                    icon={<IconCandado />}
                  />

                  {/* Select de rol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Rol del usuario
                    </label>
                    <select
                      value={formData.rol}
                      onChange={e => setFormData({ ...formData, rol: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white transition-all"
                    >
                      <option value="empleado">Empleado (Vendedor)</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>

                  {/* Botón crear */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-[#FDBA74] text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                  > 
                    {loading ? (
                      <>
                        <Spinner size="w-4 h-4" color="text-white" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <IconMas />
                        Crear usuario
                      </>
                    )}
                  </button>

                </form>
              </div>
            </div>
          </div>

          {/* ── Columna derecha: tabla de usuarios ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Cabecera de tabla */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">Usuarios registrados</h2>

                {/* Buscador */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <IconBuscar />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all w-full sm:w-52"
                  />
                </div>
              </div>

              {/* Estado: cargando */}
              {cargando && (
                <div className="py-16 text-center">
                  <Spinner size="w-8 h-8 mx-auto" />
                  <p className="text-sm text-gray-500 mt-3">Cargando usuarios...</p>
                </div>
              )}

              {/* Estado: vacío */}
              {!cargando && usuariosFiltrados.length === 0 && (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">👤</div>
                  <p className="text-gray-500 text-sm">
                    {busqueda ? 'No se encontraron resultados' : 'No hay usuarios registrados'}
                  </p>
                </div>
              )}

              {/* Tabla de usuarios */}
              {!cargando && usuariosFiltrados.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {usuariosFiltrados.map((u, i) => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">

                          {/* Columna usuario */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                                {getInitials(u.nombre)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{u.nombre}</p>
                                <p className="text-xs text-gray-500">{u.correo}</p>
                              </div>
                            </div>
                          </td>

                          {/* Columna rol */}
                          <td className="px-6 py-4">
                            <RoleBadge rol={u.rol} />
                          </td>

                          {/* Columna estado */}
                          <td className="px-6 py-4">
                            <StatusButton
                              activo={u.activo}
                              onClick={() => handleToggleStatus(u.id, u.activo)}
                            />
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pie de tabla */}
              {!cargando && usuariosFiltrados.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500">
                    Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}