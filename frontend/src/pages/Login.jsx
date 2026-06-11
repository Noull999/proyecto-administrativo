import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE}/auth/login`, { email, password });
      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoAccent}>●</span>
        </div>
        <h1 style={s.title}>Servicios Asencio</h1>
        <p style={s.sub}>Sistema de Facturación</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div className="form-group">
            <label className="label">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="correo@empresa.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.65rem', marginTop: '.25rem' }}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg)', padding: '1rem',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '2.25rem 2rem',
    width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow)',
  },
  logo: { textAlign: 'center', marginBottom: '1rem' },
  logoAccent: { fontSize: '2rem', color: 'var(--accent)' },
  title: { margin: '0 0 .3rem', fontSize: '1.3rem', fontWeight: '700', color: 'var(--text)', textAlign: 'center' },
  sub: { margin: '0 0 1.75rem', fontSize: '.8rem', color: 'var(--text-2)', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column' },
};
