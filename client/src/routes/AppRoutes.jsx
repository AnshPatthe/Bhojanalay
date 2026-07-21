import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

// Feature Imports
import { Home, About, Features, Pricing, Contact } from '@/features/landing';
import { Login, Register, ForgotPassword, ResetPassword, Verification } from '@/features/auth';
import { OnboardingWizard } from '@/features/onboarding';
import { DashboardLayout } from '@/features/dashboard';
import { WaiterDashboard, WaiterOrderScreen } from '@/features/waiter';
import { useWaiterAuth } from '@/features/waiter/store/useWaiterAuth';

// Guard: Only allow authenticated users
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated: isAdminAuth } = useAuthStore();
  const { isAuthenticated: isWaiterAuth } = useWaiterAuth();

  if (isAdminAuth) return <Navigate to="/dashboard" replace />;
  if (isWaiterAuth) return <Navigate to="/waiter/dashboard" replace />;
  
  return children;
};

const WaiterProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useWaiterAuth();
  return isAuthenticated ? children : <Navigate to="/waiter/login" replace />;
};



export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/contact" element={<Contact />} />

      {/* Public Auth Routes (Guarded against logged-in users) */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/verify-email/:token" element={<Verification />} />

      {/* Protected Routes */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />

      {/* Waiter Module Routes */}
      <Route path="/waiter/dashboard" element={<WaiterProtectedRoute><WaiterDashboard /></WaiterProtectedRoute>} />
      <Route path="/waiter/order/:tableId" element={<WaiterProtectedRoute><WaiterOrderScreen /></WaiterProtectedRoute>} />

      {/* Fallback Catch-All Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
