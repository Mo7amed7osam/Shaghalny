import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';

interface ProtectedRouteProps {
  roles?: Array<'Student' | 'Client' | 'Admin'>;
  children: React.ReactNode;
}

const ProtectedRoute = ({ roles, children }: ProtectedRouteProps) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <main id="main-content" tabIndex={-1} className="p-6 text-ink-500"><p role="status">Loading...</p></main>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && (!user || !roles.includes(user.role))) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
