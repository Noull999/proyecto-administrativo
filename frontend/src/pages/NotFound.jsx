import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={s.wrap}>
      <h1 style={s.code}>404</h1>
      <p style={s.msg}>Página no encontrada.</p>
      <button style={s.btn} onClick={() => navigate('/dashboard')}>
        Ir al dashboard
      </button>
    </div>
  );
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem' },
  code: { margin: 0, fontSize: '4rem', fontWeight: '800', color: '#e5e7eb' },
  msg: { margin: 0, color: '#6b7280', fontSize: '0.95rem' },
  btn: { padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
};
