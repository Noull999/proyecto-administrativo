import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { fmt, STATUS_LABEL, STATUS_STYLE } from '../lib/format';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'cotizacion', label: 'Cotizaciones' },
  { value: 'factura', label: 'Facturas' },
];

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'vencida', label: 'Vencida' },
];

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
          page,
          limit: 20,
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

  function exportCsv() {
    const params = new URLSearchParams();
    if (filters.tipo) params.set('tipo', filters.tipo);
    if (filters.estado) params.set('estado', filters.estado);
    const url = `${BASE}/invoices/export?${params.toString()}`;
    // Descarga usando un <a> temporal con el token en la URL (el endpoint lee Authorization header)
    // Como no podemos pasar headers en un <a>, usamos fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `facturas-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val }));
  }

  return (
    <div>
      <div style={s.header}>
        <h1 style={s.title}>Facturas y Cotizaciones</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportCsv} style={s.btnExport} title="Exportar filtro actual a CSV">
            ↓ CSV
          </button>
          <button onClick={() => navigate('/invoices/new?tipo=cotizacion')} style={s.btnSecondary}>
            + Cotización
          </button>
          <button onClick={() => navigate('/invoices/new?tipo=factura')} style={s.btnPrimary}>
            + Factura
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={s.toolbar}>
        <input
          style={s.search}
          placeholder="Buscar folio..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
        {TIPO_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter('tipo', value)}
            style={{ ...s.chip, ...(filters.tipo === value ? s.chipActive : {}) }}
          >
            {label}
          </button>
        ))}
        <span style={{ color: '#d1d5db' }}>|</span>
        {ESTADO_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter('estado', value)}
            style={{ ...s.chip, ...(filters.estado === value ? s.chipActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={s.empty}>Cargando...</p>
      ) : invoices.length === 0 ? (
        <p style={s.empty}>No hay resultados.</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              {['Folio', 'Cliente', 'Fecha', 'Vencimiento', 'Total', 'Estado', ''].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const estado = inv.estadoReal;
              return (
                <tr key={inv.id} style={s.tr}>
                  <td style={s.td}>
                    <strong style={{ fontFamily: 'monospace' }}>{inv.folio}</strong>
                    <span style={{ ...s.tipoBadge, ...(inv.tipo === 'factura' ? s.tipoBadgeFact : {}) }}>
                      {inv.tipo === 'factura' ? 'FAC' : 'COT'}
                    </span>
                  </td>
                  <td style={s.td}>{inv.client?.nombre}</td>
                  <td style={s.td}>{fmt.date(inv.fecha)}</td>
                  <td style={s.td}>{fmt.date(inv.fechaVencimiento)}</td>
                  <td style={{ ...s.td, fontWeight: '600' }}>{fmt.currency(inv.total)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...STATUS_STYLE[estado] }}>
                      {STATUS_LABEL[estado]}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      style={s.btnAction}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {pagination && pagination.pages > 1 && (
        <div style={s.pagination}>
          <button style={s.pgBtn} disabled={page === 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span style={s.pgInfo}>Página {pagination.page} de {pagination.pages} ({pagination.total} total)</span>
          <button style={s.pgBtn} disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  title: { margin: 0, fontSize: '1.5rem', color: '#111827' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  search: { padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', width: '160px' },
  chip: { padding: '0.3rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '999px', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280' },
  chipActive: { backgroundColor: '#1e293b', color: '#fff', borderColor: '#1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#374151', verticalAlign: 'middle' },
  empty: { color: '#9ca3af', textAlign: 'center', margin: '3rem 0' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' },
  pgBtn: { padding: '0.4rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' },
  pgInfo: { fontSize: '0.875rem', color: '#6b7280' },
  badge: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '500' },
  tipoBadge: { display: 'inline-block', marginLeft: '0.4rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '600', verticalAlign: 'middle' },
  tipoBadgeFact: { backgroundColor: '#fce7f3', color: '#9d174d' },
  btnPrimary: { padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  btnSecondary: { padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
  btnExport: { padding: '0.5rem 0.875rem', backgroundColor: '#fff', color: '#059669', border: '1px solid #059669', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  btnAction: { padding: '0.25rem 0.75rem', background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#374151' },
};
