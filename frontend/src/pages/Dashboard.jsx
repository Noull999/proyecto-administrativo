import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { fmt } from '../lib/format';

const STATUS_CONFIG = {
  pagada:   { label: 'Pagada',   cls: 'badge-pagada',   bar: '#4ade80' },
  enviada:  { label: 'Enviada',  cls: 'badge-enviada',  bar: '#60a5fa' },
  vencida:  { label: 'Vencida',  cls: 'badge-vencida',  bar: '#f87171' },
  borrador: { label: 'Borrador', cls: 'badge-borrador', bar: '#555555' },
};

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

  const kpis = stats ? [
    { label: 'Total cobrado',  value: fmt.currency(stats.montoPagado),   sub: `${stats.conteo.pagada ?? 0} pagadas`,  color: '#4ade80' },
    { label: 'Por cobrar',     value: fmt.currency(stats.montoPendiente), sub: `${stats.conteo.enviada ?? 0} enviadas`, color: '#60a5fa' },
    { label: 'Monto vencido',  value: fmt.currency(stats.montoVencido),   sub: `${stats.conteo.vencida ?? 0} vencidas`, color: 'var(--accent)' },
    { label: 'Borradores',     value: stats.conteo.borrador ?? 0,         sub: 'por enviar',                            color: 'var(--text-2)' },
  ] : [];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Bienvenido, {user?.nombre}</h1>
          <p className="page-sub">Resumen de facturación</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new?tipo=factura')}>
          + Nueva factura
        </button>
      </div>

      {/* KPIs */}
      <div style={s.grid4}>
        {loading
          ? [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '100px' }} />)
          : kpis.map(({ label, value, sub, color }) => (
            <div key={label} className="card" style={s.kpi}>
              <p style={s.kpiLabel}>{label}</p>
              <p style={{ ...s.kpiValue, color }}>{value}</p>
              <p style={s.kpiSub}>{sub}</p>
            </div>
          ))
        }
      </div>

      {stats && (
        <div style={s.grid2}>
          {/* Distribución */}
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <p style={s.sectionTitle}>Distribución por estado</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              {['pagada','enviada','vencida','borrador'].map(estado => {
                const cfg = STATUS_CONFIG[estado];
                const count = stats.conteo[estado] ?? 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={estado}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                      <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-2)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={s.barBg}>
                      <div style={{ ...s.barFill, width: `${pct}%`, background: cfg.bar }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimas */}
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <p style={s.sectionTitle}>Últimas facturas</p>
            {stats.recientes.length === 0 ? (
              <p className="empty-state" style={{ padding: '1.5rem 0' }}>Sin facturas aún.</p>
            ) : (
              <table className="tbl">
                <tbody>
                  {stats.recientes.map(inv => (
                    <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{inv.folio}</strong>
                        <br />
                        <span style={{ color: 'var(--text-2)', fontSize: '.72rem' }}>{inv.client?.nombre}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{fmt.currency(inv.total)}</strong>
                        <br />
                        <span className={`badge ${STATUS_CONFIG[inv.estadoReal]?.cls}`}>
                          {STATUS_CONFIG[inv.estadoReal]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              onClick={() => navigate('/invoices')}
              style={s.verTodas}
            >
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
  kpi: { display: 'flex', flexDirection: 'column' },
  kpiLabel: { margin: '0 0 .4rem', fontSize: '.7rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '.05em' },
  kpiValue: { margin: '0 0 .25rem', fontSize: '1.55rem', fontWeight: '700' },
  kpiSub: { margin: 0, fontSize: '.72rem', color: 'var(--text-3)' },
  sectionTitle: { margin: '0 0 1rem', fontSize: '.7rem', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' },
  barBg: { height: '5px', background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden' },
  barFill: { height: '5px', borderRadius: '999px', transition: 'width .4s ease' },
  verTodas: { marginTop: '.75rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '.8rem', padding: 0, fontFamily: 'inherit' },
};
