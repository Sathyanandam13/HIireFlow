import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import CompanyDashboard from './pages/CompanyDashboard';
import ApplicantPortal from './pages/ApplicantPortal';
import EntryScreen from './pages/EntryScreen';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  
  return children;
}

function Navbar() {
  const { user, logout } = useAuth();
  
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl leading-none">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">HireFlow</span>
            </Link>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">{user.name} ({user.role})</span>
              <button 
                onClick={logout}
                className="text-sm text-red-600 font-medium hover:text-red-800"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<EntryScreen />} />
          <Route path="/auth/:role" element={<AuthPage />} />
          <Route 
            path="/company/dashboard" 
            element={
              <PrivateRoute role="company">
                <CompanyDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/applicant/dashboard" 
            element={
              <PrivateRoute role="applicant">
                <ApplicantPortal />
              </PrivateRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
