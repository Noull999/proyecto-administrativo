import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';

const ROLE_LABEL = { SUPERADMIN: 'Super Admin', ADMIN: 'Admin', CONTABLE: 'Contable', LECTOR: 'Lector' };
const ROLE_COLOR = { SUPERADMIN: '#7c3aed', ADMIN: '#2563eb', CONTABLE: '#059669', LECTOR: '#6b7280' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/clients', label: 'Clientes' },
    { to: '/products', label: 'Productos' },
    { to: '/invoices', label: 'Facturas' },
    ...(isAdmin ? [
      { to: '/users', label: 'Usuarios' },
      { to: '/settings', label: 'Configuración' },
    ] : []),
    ...(isSuperAdmin ? [{ to: '/admin', label: '⚙ Empresas' }] : []),
  ];

  return (
    <div style={styles.root}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandText}>{user?.workspace?.nombre ?? 'Facturación'}</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div>
            <span style={styles.userName}>{user?.nombre}</span>
            <span style={{
              ...styles.roleBadge,
              backgroundColor: ROLE_COLOR[user?.role] ?? '#6b7280',
            }}>
              {ROLE_LABEL[user?.role] ?? user?.role}
            </span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
        </div>
      </aside>

      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  root: { display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' },
  sidebar: { width: '220px', backgroundColor: '#1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  brand: { padding: '1.25rem 1rem', borderBottom: '1px solid #334155' },
  brandText: { color: '#f1f5f9', fontWeight: '700', fontSize: '0.875rem', letterSpacing: '0.02em' },
  nav: { flex: 1, padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: {
    display: 'block', padding: '0.6rem 1rem', color: '#94a3b8',
    textDecoration: 'none', fontSize: '0.875rem', transition: 'background 0.15s, color 0.15s',
  },
  navItemActive: { backgroundColor: '#0f172a', color: '#f1f5f9' },
  sidebarBottom: { padding: '1rem', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  userName: { color: '#94a3b8', fontSize: '0.8rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: { display: 'inline-block', marginTop: '0.25rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', color: '#fff', fontWeight: '600' },
  logoutBtn: { padding: '0.375rem 0.5rem', background: 'none', border: '1px solid #475569', borderRadius: '4px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', textAlign: 'left' },
  main: { flex: 1, overflow: 'auto', padding: '2rem' },
};
