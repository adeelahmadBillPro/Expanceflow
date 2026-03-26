import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Budgets from './pages/Budgets';
import Invoices from './pages/Invoices';
import InvoiceBuilder from './pages/InvoiceBuilder';
import InvoiceView from './pages/InvoiceView';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Business from './pages/Business';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import Admin from './pages/Admin';
import Billing from './pages/Billing';
import Guide from './pages/Guide';
import Team from './pages/Team';
import ActivityLog from './pages/ActivityLog';
import Categories from './pages/Categories';
import ForgotPassword from './pages/ForgotPassword';
import Notifications from './pages/Notifications';
import Import from './pages/Import';
import Backup from './pages/Backup';
import NotebookScanner from './pages/NotebookScanner';
import Reports from './pages/Reports';
import ClientStatement from './pages/ClientStatement';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <div className="w-10 h-10 border-[3px] border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/terms" element={<Terms />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceBuilder />} />
        <Route path="invoices/:id" element={<InvoiceView />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id/statement" element={<ClientStatement />} />
        <Route path="products" element={<Products />} />
        <Route path="business" element={<Business />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={<Admin />} />
        <Route path="billing" element={<Billing />} />
        <Route path="guide" element={<Guide />} />
        <Route path="team" element={<Team />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="categories" element={<Categories />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="import" element={<Import />} />
        <Route path="backup" element={<Backup />} />
        <Route path="notebook-scanner" element={<NotebookScanner />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '10px', background: '#0f172a', color: '#f8fafc', fontSize: '13px' },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
