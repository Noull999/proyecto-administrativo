import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import './Layout.css';

const ROLE_LABEL = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CONTABLE: 'Contable',
  LECTOR: 'Lector',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard',    icon: '▪' },
    { to: '/clients',   label: 'Clientes',     icon: '▪' },
    { to: '/products',  label: 'Productos',    icon: '▪' },
    { to: '/invoices',  label: 'Facturas',     icon: '▪' },
    ...(isAdmin ? [
      { to: '/users',    label: 'Usuarios',    icon: '▪' },
      { to: '/settings', label: 'Configuración', icon: '▪' },
    ] : []),
    ...(isSuperAdmin ? [{ to: '/admin', label: 'Empresas', icon: '▪' }] : []),
  ];

  return (
    <div className="layout-root">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">{user?.workspace?.nombre ?? 'Facturación'}</span>
          <span className="sidebar-brand-tag">Sistema de Facturación</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-dot">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.nombre}</span>
            <span className="sidebar-user-role">{ROLE_LABEL[user?.role] ?? user?.role}</span>
          </div>
          <button onClick={handleLogout} className="sidebar-logout">Salir</button>
        </div>
      </aside>

      <main className="layout-main">{children}</main>
    </div>
  );
}
