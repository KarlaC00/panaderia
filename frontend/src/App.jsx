import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Importación de tus páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import Inventario from './pages/Inventario';
import Navbar from './components/Navbar';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />

          {/* Rutas Protegidas (Cualquier usuario logueado) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Rutas Solo para Vendedores o Admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'vendedor']} />}>
            <Route path="/ventas" element={<Ventas />} />
          </Route>

          {/* Rutas Solo para Admin (Gestión de Inventario/Panadería) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/inventario" element={<Inventario />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;