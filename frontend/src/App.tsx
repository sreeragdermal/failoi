import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { PublicRoute } from './components/PublicRoute.js';

// Pages
import { Landing } from './pages/Landing.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { ForgotPassword } from './pages/ForgotPassword.js';
import { ResetPassword } from './pages/ResetPassword.js';
import { Dashboard } from './pages/Dashboard.js';
import { PublicReader } from './pages/PublicReader.js';
import { EmbedReader } from './pages/EmbedReader.js';
import { Analytics } from './pages/Analytics.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { Workspace } from './pages/Workspace.js';

const AppContent: React.FC = () => {
  const { user, returnFromImpersonation } = useAuth();

  const handleReturn = async () => {
    try {
      await returnFromImpersonation();
      // Redirect back to Admin Console
      window.location.href = '/dashboard/admin';
    } catch (err: any) {
      alert(err.message || 'Failed to return to admin');
    }
  };

  return (
    <BrowserRouter>
      {user?.isImpersonated && (
        <div style={{
          backgroundColor: '#ef4444',
          color: '#ffffff',
          padding: '12px 24px',
          textAlign: 'center',
          fontWeight: '600',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          zIndex: 99999,
          position: 'sticky',
          top: 0,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
          letterSpacing: '0.02em',
        }}>
          <span>You are currently impersonating this user ({user.email}).</span>
          <button
            onClick={handleReturn}
            style={{
              padding: '6px 14px',
              fontSize: '0.75rem',
              backgroundColor: '#ffffff',
              color: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              transition: 'all 0.15s ease',
            }}
          >
            Return to Super Admin
          </button>
        </div>
      )}
      <Routes>
        {/* Publicly accessible Landing page */}
        <Route path="/" element={<Landing />} />

        {/* Auth Routes (Redirects to dashboard if logged in) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Protected Routes (Requires Authentication) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/analytics/:id"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Viewers (Unprotected) */}
        <Route path="/workspace/:id" element={<Workspace />} />
        <Route path="/f/:slug" element={<PublicReader />} />
        <Route path="/embed/:slug" element={<EmbedReader />} />

        {/* Fallback to Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
