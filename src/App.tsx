/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import LeadManagement from './pages/LeadManagement';
import SchoolsPage from './pages/SchoolsPage';
import CoursesPage from './pages/CoursesPage';
import SchoolOffersPage from './pages/SchoolOffersPage';
import UsersPage from './pages/UsersPage';
import SetupPage from './pages/SetupPage';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center font-sans">Carregando...</div>;
  
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />
          
          <Route path="/admin/*" element={
            <PrivateRoute>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="leads" element={<LeadManagement />} />
                <Route path="schools" element={<SchoolsPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="offers" element={<SchoolOffersPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </PrivateRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
