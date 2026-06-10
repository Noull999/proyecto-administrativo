import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { fmt, STATUS_LABEL, STATUS_STYLE } from '../lib/format';

export default function Dashboard() {
  const { user } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invoices/stats')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        {
          label: 'Total cobrado',
          value: fmt.currency(stats.montoPagado),
          sub: `${stats.conteo.pagada ?? 0} factura${stats.conteo.pagada !== 1 ? 's' : ''} pagada${stats.conteo.pagada !== 1 ? 's' : ''}`,
          color: '#166534',
          bg: '#f0fdf4',
          border: '#bbf7d0',
        },
        {
          label: 'Por cobrar',
          value: fmt.currency(stats.montoPendiente),
          sub: `${stats.conteo.enviada ?? 0} enviada${stats.conteo.enviada !== 1 ? 's' : ''}`,
          color: '#1d4ed8',
          bg: '#eff6ff',
          border: '#bfdbfe',
        },
        {
          label: 'Monto vencido',
          value: fmt.currency(stats.montoVencido),
          sub: `${stats.conteo.vencida ?? 0} vencida${stats.conteo.vencida !== 1 ? 's' : ''}`,
          color: '#991b1b',
          bg: '#fef2f2',
          border: '#fecaca',
        },
        {
          label: 'En borrador',
          value: stats.conteo.borrador ?? 0,
          sub: 'pendientes de enviar',
          color: '#374151',
          bg: '#f9fafb',
          border: '#e5e7eb',
        },
      ]
    : [];

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', color: '#111827' }}>
          Bienvenido, {user?.nombre}
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          Resumen de facturación — Servicios Asencio
        </p>
      </div>

      {/* Tarjetas KPI */}
      <div style={s.grid4}>
        {loading
          ? [1, 2, 3, 4].map((i) => <div key={i} style={{ ...s.card, height: '100px', backgroundColor: '#f9fafb' }} />)
          : cards.map(({ label, value, sub, color, bg, border }) => (
              <div key={label} style={{ ...s.card, backgroundColor: bg, borderColor: border }}>
                <p style={s.cardLabel}>{label}</p>
                <p style={{ ...s.cardValue, color }}>{value}</p>
                <p style={s.cardSub}>{sub}</p>
              </div>
            ))}
      </div>

      {/* Estado de facturas */}
      {stats && (
        <div style={s.grid2}>
          <div style={{ ...s.card, marginTop: '1.25rem' }}>
            <h2 style={s.sectionTitle}>Distribución por estado</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['pagada', 'enviada', 'vencida', 'borrador'].map((estado) => {
                const count = stats.conteo[estado] ?? 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={estado}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.8rem', ...STATUS_STYLE[estado], padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: '500' }}>
                        {STATUS_LABEL[estado]}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={s.barBg}>
                      <div style={{ ...s.barFill, width: `${pct}%`, backgroundColor: STATUS_STYLE[estado]?.color ?? '#9ca3af' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimas facturas */}
          <div style={{ ...s.card, marginTop: '1.25rem' }}>
            <h2 style={s.sectionTitle}>Últimas facturas</h2>
            {stats.recientes.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Sin facturas aún.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {stats.recientes.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      style={s.recienteRow}
                    >
                      <td style={{ padding: '0.6rem 0', fontSize: '0.8rem' }}>
                        <strong style={{ fontFamily: 'monospace' }}>{inv.folio}</strong>
                        <br />
                        <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>{inv.client?.nombre}</span>
                      </td>
                      <td style={{ padding: '0.6rem 0', textAlign: 'right', fontSize: '0.8rem' }}>
                        <strong>{fmt.currency(inv.total)}</strong>
                        <br />
                        <span style={{ ...STATUS_STYLE[inv.estadoReal], padding: '0.1rem 0.4rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '500' }}>
                          {STATUS_LABEL[inv.estadoReal]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => navigate('/invoices')} style={s.verTodas}>
              Ver todas las facturas →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  card: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem' },
  cardLabel: { margin: '0 0 0.4rem', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' },
  cardValue: { margin: '0 0 0.25rem', fontSize: '1.6rem', fontWeight: '700' },
  cardSub: { margin: 0, fontSize: '0.72rem', color: '#9ca3af' },
  sectionTitle: { margin: '0 0 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  barBg: { height: '6px', backgroundColor: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' },
  barFill: { height: '6px', borderRadius: '999px', transition: 'width 0.4s ease' },
  recienteRow: { borderBottom: '1px solid #f3f4f6', cursor: 'pointer' },
  verTodas: { marginTop: '0.75rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', padding: 0 },
};
