import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Workspace from './pages/Workspace.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminLogs from './pages/AdminLogs.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminGacetas from './pages/AdminGacetas.jsx';
import AdminGacetaDetail from './pages/AdminGacetaDetail.jsx';

function NavBar() {
  const { user, esAdmin, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const salir = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">📄 Transcriptor de Gacetas</div>
      <div className="navbar-links">
        {esAdmin ? (
          <Link to="/admin/dashboard">Panel</Link>
        ) : (
          <Link to="/">Trabajo</Link>
        )}
        {esAdmin && <Link to="/admin/gacetas">Gacetas</Link>}
        {esAdmin && <Link to="/admin/usuarios">Usuarios</Link>}
        {esAdmin && <Link to="/admin/bitacora">Bitácora</Link>}
        <span className="navbar-user">
          {user.nombre} <em>({user.role})</em>
        </span>
        <button className="btn btn-sm" onClick={salir}>
          Salir
        </button>
      </div>
    </nav>
  );
}

function Inicio() {
  const { esAdmin } = useAuth();
  return esAdmin ? <Navigate to="/admin/dashboard" replace /> : <Workspace />;
}

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Inicio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute soloAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gacetas"
          element={
            <ProtectedRoute soloAdmin>
              <AdminGacetas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gacetas/:id"
          element={
            <ProtectedRoute soloAdmin>
              <AdminGacetaDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute soloAdmin>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bitacora"
          element={
            <ProtectedRoute soloAdmin>
              <AdminLogs />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
