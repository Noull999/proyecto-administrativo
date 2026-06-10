import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '▪' },
  { to: '/clients', label: 'Clientes', icon: '▪' },
  { to: '/products', label: 'Productos', icon: '▪' },
  { to: '/invoices', label: 'Facturas', icon: '▪' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={styles.root}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandText}>Servicios Asencio</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.navIcon}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <span style={styles.userName}>{user?.nombre}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Salir
          </button>
        </div>
      </aside>

      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  brand: {
    padding: '1.25rem 1rem',
    borderBottom: '1px solid #334155',
  },
  brandText: {
    color: '#f1f5f9',
    fontWeight: '700',
    fontSize: '0.9rem',
    letterSpacing: '0.02em',
  },
  nav: {
    flex: 1,
    padding: '0.75rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.875rem',
    borderRadius: '0',
    transition: 'background 0.15s, color 0.15s',
  },
  navItemActive: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
  },
  navIcon: { fontSize: '0.5rem' },
  sidebarBottom: {
    padding: '1rem',
    borderTop: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  userName: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    padding: '0.375rem 0.5rem',
    background: 'none',
    border: '1px solid #475569',
    borderRadius: '4px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.75rem',
    textAlign: 'left',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '2rem',
  },
};
