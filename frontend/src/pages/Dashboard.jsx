import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', color: '#111827' }}>
        Bienvenido, {user?.nombre}
      </h1>
      <p style={{ margin: '0 0 2rem', color: '#6b7280', fontSize: '0.875rem' }}>
        Dashboard con métricas — disponible en Fase 4.
      </p>

      <div style={grid}>
        {cards.map(({ label, value, sub, color }) => (
          <div key={label} style={card}>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color }}>{value}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const cards = [
  { label: 'Facturado este mes', value: '$0', sub: 'Disponible en Fase 4', color: '#111827' },
  { label: 'Pendiente de cobro', value: '$0', sub: 'Disponible en Fase 4', color: '#d97706' },
  { label: 'Facturas vencidas', value: '0', sub: 'Disponible en Fase 4', color: '#dc2626' },
  { label: 'Clientes activos', value: '—', sub: 'Disponible en Fase 4', color: '#2563eb' },
];

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' };
const card = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem' };
