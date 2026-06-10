import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import NotFound from './pages/NotFound';

function AppLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>
        <ErrorBoundary>{children}</ErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/clients" element={<AppLayout><Clients /></AppLayout>} />
          <Route path="/products" element={<AppLayout><Products /></AppLayout>} />
          <Route path="/invoices" element={<AppLayout><Invoices /></AppLayout>} />
          <Route path="/invoices/new" element={<AppLayout><InvoiceForm /></AppLayout>} />
          <Route path="/invoices/:id/edit" element={<AppLayout><InvoiceForm /></AppLayout>} />
          <Route path="/invoices/:id" element={<AppLayout><InvoiceDetail /></AppLayout>} />
          <Route path="/404" element={<AppLayout><NotFound /></AppLayout>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
