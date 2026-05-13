import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

const isActive = (path) =>
  location.pathname === path ||
  location.pathname.startsWith(path + '/');

  const getInitials = (nombre) =>
    nombre
      ? nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';

  const NavLink = ({ to, children, highlight }) => (
  <Link
    to={to}
    onClick={() => setMobileOpen(false)}
    className={[
      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
      highlight
        ? 'bg-[#F97316] text-white hover:bg-[#EA580C]'
        : isActive(to)
          ? 'bg-[#FFF7ED] text-[#C2410C]'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    ].join(' ')}
  >
    {children}
  </Link>
);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white text-lg">
              🥖
            </div>
            <span className="font-bold text-gray-900 text-lg hidden sm:block">MAXIPAN</span>
          </div>

          {/* Links escritorio */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Inicio
            </NavLink>

            <NavLink to="/ventas">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Ventas
            </NavLink>

            {user.rol === 'administrador' && (
              <>
                <NavLink to="/inventario">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Inventario
                </NavLink>

                <NavLink to="/usuarios" highlight>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Personal
                </NavLink>
              </>
            )}
          </div>

          {/* Usuario + logout escritorio */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                {getInitials(user.nombre)}
              </div>
              <div className="text-xs">
                <p className="font-medium text-gray-900 leading-tight">{user.nombre}</p>
                <p className="text-gray-500 capitalize leading-tight">{user.rol}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Salir
            </button>
          </div>

          {/* Hamburger móvil */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Menú móvil desplegable */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <NavLink to="/dashboard">Inicio</NavLink>
            <NavLink to="/ventas">Ventas</NavLink>

            {user.rol === 'administrador' && (
              <>
                <NavLink to="/inventario">Inventario</NavLink>
                <NavLink to="/usuarios" highlight>Personal</NavLink>
              </>
            )}

            <div className="pt-2 border-t border-gray-100 mt-2">
              <div className="px-3 py-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                  {getInitials(user.nombre)}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.nombre}</p>
                  <p className="text-gray-500 text-xs capitalize">{user.rol}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}