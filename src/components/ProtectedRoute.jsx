import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  if (superAdminOnly && user.role !== 'super_admin') return <Navigate to="/admin" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
}