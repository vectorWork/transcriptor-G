import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, soloAdmin = false }) {
  const { user, cargando, esAdmin } = useAuth();

  if (cargando) return <div className="centro">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />;
  return children;
}
