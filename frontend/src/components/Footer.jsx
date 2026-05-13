export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center text-white text-xs">🥖</div>
            <span className="text-sm font-semibold text-gray-700">MAXIPAN</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">Sistema de Gestión</span>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Sistema activo
            </span>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-400">
            © {year} MAXIPAN · Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
