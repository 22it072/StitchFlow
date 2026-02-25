// frontend/src/App.jsx (Updated with Weaving Module)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationContainer from './components/notifications/NotificationContainer';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import YarnLibrary from './pages/YarnLibrary';
import NewEstimate from './pages/NewEstimate';
import EstimateHistory from './pages/EstimateHistory';
import EstimateDetail from './pages/EstimateDetail';
import EstimateComparison from './pages/EstimateComparison';
import Settings from './pages/Settings';

// Production Pages
import ProductionPlanner from './pages/ProductionPlanner';
import ProductionHistory from './pages/ProductionHistory';
import ProductionDetail from './pages/ProductionDetail';
import ProductionAnalyticsPage from './pages/ProductionAnalyticsPage';

// Company Pages
import JoinCompany from './pages/JoinCompany';
import CompanySettings from './pages/CompanySettings';
import UserManagement from './pages/UserManagement';

// Party & Challan Pages
import PartyManagement from './pages/PartyManagement';
import PartyDetails from './pages/PartyDetails';
import ChallanList from './pages/ChallanList';
import NewChallan from './pages/NewChallan';
import ChallanDetail from './pages/ChallanDetail';

// Weaving Module Pages
import WeavingDashboard from './pages/WeavingDashboard';
import LoomManagement from './pages/LoomManagement';
import BeamManagement from './pages/BeamManagement';
import WeavingSetManagement from './pages/WeavingSetManagement';
import ProductionEntry from './pages/ProductionEntry';
import WeavingProductionHistory from './pages/WeavingProductionHistory';
import ProductionEntryDetails from './pages/ProductionEntryDetails';
import MaintenanceLog from './pages/MaintenanceLog';
import LoomDetail from './pages/LoomDetail';
import BeamDetail from './pages/BeamDetail';
import WeavingSetDetail from './pages/WeavingSetDetail';
// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>
          </div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Company Required Route
const CompanyRequiredRoute = ({ children }) => {
  const { activeCompany, loading, hasCompany } = useCompany();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>
          </div>
          <p className="text-gray-600 mt-4">Loading company data...</p>
        </div>
      </div>
    );
  }

  if (!hasCompany) {
    return <Navigate to="/companies/join" replace />;
  }

  if (!activeCompany) {
    return <Navigate to="/companies/join" replace />;
  }

  return children;
};

// Public Route
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Inner App with Company Context
const AppContent = () => {
  return (
    <>
      <NotificationContainer />
      
      <Routes>
        {/* Public Routes */}
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

        {/* Company Join/Create */}
        <Route
          path="/companies/join"
          element={
            <ProtectedRoute>
              <JoinCompany />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes with Company Required */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <CompanyRequiredRoute>
                <Layout />
              </CompanyRequiredRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Yarn Management */}
          <Route path="yarns" element={<YarnLibrary />} />
          
          {/* Estimate Management */}
          <Route path="estimates/new" element={<NewEstimate />} />
          <Route path="estimates/edit/:id" element={<NewEstimate />} />
          <Route path="estimates/compare" element={<EstimateComparison />} />
          <Route path="estimates/:id" element={<EstimateDetail />} />
          <Route path="estimates" element={<EstimateHistory />} />
          
          {/* Production Management */}
          <Route path="productions/new" element={<ProductionPlanner />} />
          <Route path="productions/analytics" element={<ProductionAnalyticsPage />} />
          <Route path="productions/:id" element={<ProductionDetail />} />
          <Route path="productions" element={<ProductionHistory />} />
          
          {/* Party Management */}
          <Route path="parties" element={<PartyManagement />} />
          <Route path="parties/:id" element={<PartyDetails />} />
          <Route path="parties/:id/edit" element={<PartyManagement />} />
          
          {/* Challan Management */}
          <Route path="challans" element={<ChallanList />} />
          <Route path="challans/new" element={<NewChallan />} />
          <Route path="challans/:id" element={<ChallanDetail />} />
          
          {/* Weaving Module Routes */}
          <Route path="weaving" element={<WeavingDashboard />} />
          <Route path="weaving/looms" element={<LoomManagement />} />
          <Route path="weaving/beams" element={<BeamManagement />} />
          <Route path="weaving/sets" element={<WeavingSetManagement />} />
          <Route path="weaving/production/new" element={<ProductionEntry />} />
          <Route path="/weaving/production" element={<WeavingProductionHistory />} />
          <Route path="/weaving/production/:id" element={<ProductionEntryDetails />} />
          <Route path="/weaving/maintenance" element={<MaintenanceLog />} />
          <Route path="/weaving/looms/:id" element={<LoomDetail />} />
          <Route path="/weaving/beams/:id" element={<BeamDetail />} />
          <Route path="/weaving/sets/:id" element={<WeavingSetDetail />} />

          {/* Company Management */}
          <Route path="company/settings" element={<CompanySettings />} />
          <Route path="company/users" element={<UserManagement />} />
          
          {/* User Settings */}
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

function App() {
  const { user } = useAuth();

  return (
    <NotificationProvider>
      {user ? (
        <CompanyProvider>
          <AppContent />
        </CompanyProvider>
      ) : (
        <AppContent />
      )}
    </NotificationProvider>
  );
}

export default App;