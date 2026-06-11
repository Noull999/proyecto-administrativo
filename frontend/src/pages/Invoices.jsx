import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../lib/format';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

const STATUS_CONFIG = {
  pagada:   { label: 'Pagada',   cls: 'badge-pagada' },
  enviada:  { label: 'Enviada',  cls: 'badge-enviada' },
  vencida:  { label: 'Vencida',  cls: 'badge-vencida' },
  borrador: { label: 'Borrador', cls: 'badge-borrador' },
};

const TIPO_OPTS  = [{ v: '', l: 'Todos' }, { v: 'cotizacion', l: 'Cotizaciones' }, { v: 'factura', l: 'Facturas' }];
const ESTADO_OPTS = [{ v: '', l: 'Todos' }, { v: 'borrador', l: 'Borrador' }, { v: 'enviada', l: 'Enviada' }, { v: 'pagada', l: 'Pagada' }, { v: 'vencida', l: 'Vencida' }];

export default function Invoices() {
  const api = useApi();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ tipo: '', estado: '', search: '' });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invoices', {
        params: {
          tipo: filters.tipo || undefined,
          estado: filters.estado || undefined,
          search: filters.search || undefined,
          page, limit: 20,
        },
      });
      setInvoices(data.data);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { setPage(1); }, [filters]);

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]: val })); }

  function exportCsv() {
    const params = new URLSearchParams();
    if (filters.tipo) params.set('tipo', filters.tipo);
    if (filters.estado) params.set('estado', filters.estado);
    fetch(`${BASE}/invoices/export?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `facturas-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Facturas y Cotizaciones</h1>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={exportCsv} className="btn btn-ghost btn-sm">↓ CSV</button>
          <button onClick={() => navigate('/invoices/new?tipo=cotizacion')} className="btn btn-secondary">+ Cotización</button>
          <button onClick={() => navigate('/invoices/new?tipo=factura')} className="btn btn-primary">+ Factura</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={s.toolbar}>
        <input
          className="input"
          style={{ width: '170px', padding: '.38rem .7rem', fontSize: '.8rem' }}
          placeholder="Buscar folio..."
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
        />
        <span style={{ color: 'var(--border)', fontSize: '1.2rem', marginInline: '.25rem' }}>|</span>
        {TIPO_OPTS.map(({ v, l }) => (
          <button key={v} onClick={() => setFilter('tipo', v)} className={`chip${filters.tipo === v ? ' active' : ''}`}>{l}</button>
        ))}
        <span style={{ color: 'var(--border)', fontSize: '1.2rem', marginInline: '.25rem' }}>|</span>
        {ESTADO_OPTS.map(({ v, l }) => (
          <button key={v} onClick={() => setFilter('estado', v)} className={`chip${filters.estado === v ? ' active' : ''}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">No hay resultados para los filtros seleccionados.</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const cfg = STATUS_CONFIG[inv.estadoReal] ?? STATUS_CONFIG.borrador;
                return (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td>
                      <strong style={{ fontFamily: 'monospace' }}>{inv.folio}</strong>
                      <span style={s.tipoBadge(inv.tipo)}>{inv.tipo === 'factura' ? 'FAC' : 'COT'}</span>
                    </td>
                    <td>{inv.client?.nombre}</td>
                    <td>{fmt.date(inv.fecha)}</td>
                    <td>{fmt.date(inv.fechaVencimiento)}</td>
                    <td><strong style={{ color: 'var(--text)' }}>{fmt.currency(inv.total)}</strong></td>
                    <td><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div style={s.pagination}>
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>Página {pagination.page} de {pagination.pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '1rem', flexWrap: 'wrap' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' },
  tipoBadge: (tipo) => ({
    display: 'inline-block', marginLeft: '.4rem', padding: '.1rem .4rem',
    borderRadius: '4px', fontSize: '.62rem', fontWeight: '600', verticalAlign: 'middle',
    background: tipo === 'factura' ? 'rgba(220,38,38,.15)' : 'rgba(59,130,246,.12)',
    color: tipo === 'factura' ? 'var(--accent)' : '#60a5fa',
  }),
};
