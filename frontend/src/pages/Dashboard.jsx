import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Servicios Asencio</h1>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{user?.nombre}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.welcome}>Bienvenido, {user?.nombre}</h2>
        <p style={styles.subtitle}>
          Dashboard en construcción — Fase 4 del plan de desarrollo.
        </p>

        <div style={styles.grid}>
          {['Clientes', 'Productos', 'Facturas', 'Reportes'].map((item) => (
            <div key={item} style={styles.card}>
              <h3 style={styles.cardTitle}>{item}</h3>
              <p style={styles.cardText}>Próximamente</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { margin: 0, fontSize: '1.125rem', fontWeight: '700', color: '#111827' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { fontSize: '0.875rem', color: '#374151' },
  logoutBtn: {
    padding: '0.375rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: '#374151',
  },
  main: { padding: '2rem 1.5rem' },
  welcome: { margin: '0 0 0.5rem', color: '#111827' },
  subtitle: { margin: '0 0 2rem', color: '#6b7280', fontSize: '0.875rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
  },
  cardTitle: { margin: '0 0 0.5rem', fontSize: '1rem', color: '#111827' },
  cardText: { margin: 0, fontSize: '0.875rem', color: '#9ca3af' },
};
