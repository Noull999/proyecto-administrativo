import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fmt, STATUS_LABEL, STATUS_STYLE } from '../lib/format';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [payForm, setPayForm] = useState({ monto: '', metodo: 'transferencia', referencia: '' });
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);
  const [actionError, setActionError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPagado = invoice?.payments?.reduce((sum, p) => sum + p.monto, 0) ?? 0;
  const saldo = (invoice?.total ?? 0) - totalPagado;
  const estado = invoice?.estadoReal;

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.folio}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Error al generar el PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function handleAction(action) {
    setActionError('');
    try {
      await api.post(`/invoices/${id}/${action}`);
      fetch();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error');
    }
  }

  async function handlePay() {
    if (!payForm.monto || isNaN(Number(payForm.monto)) || Number(payForm.monto) <= 0) {
      setPayError('El monto debe ser un número positivo');
      return;
    }
    setPaying(true);
    setPayError('');
    try {
      await api.post(`/invoices/${id}/payments`, payForm);
      setPaymentModal(false);
      setPayForm({ monto: '', metodo: 'transferencia', referencia: '' });
      fetch();
    } catch (err) {
      setPayError(err.response?.data?.error || 'Error al registrar pago');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <p style={{ color: '#9ca3af' }}>Cargando...</p>;
  if (!invoice) return <p style={{ color: '#dc2626' }}>Factura no encontrada.</p>;

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={s.folio}>{invoice.folio}</h1>
            <span style={{ ...s.badge, ...STATUS_STYLE[estado] }}>{STATUS_LABEL[estado]}</span>
            <span style={s.tipoBadge}>{invoice.tipo === 'factura' ? 'FACTURA' : 'COTIZACIÓN'}</span>
          </div>
          <p style={s.clientName}>{invoice.client?.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/invoices')} style={s.btnSecondary}>← Volver</button>
          <button onClick={handleDownloadPdf} style={s.btnSecondary} disabled={downloading}>
            {downloading ? 'Generando...' : 'Descargar PDF'}
          </button>
          {estado !== 'pagada' && (
            <button onClick={() => navigate(`/invoices/${id}/edit`)} style={s.btnSecondary}>Editar</button>
          )}
          {estado === 'borrador' && (
            <button onClick={() => handleAction('send')} style={s.btnAction}>Marcar enviada</button>
          )}
          {invoice.tipo === 'cotizacion' && estado !== 'pagada' && (
            <button onClick={() => handleAction('convert')} style={s.btnAction}>
              Convertir a Factura
            </button>
          )}
          {estado !== 'pagada' && (
            <button onClick={() => { setPaymentModal(true); setPayForm({ monto: String(Math.max(0, saldo).toFixed(2)), metodo: 'transferencia', referencia: '' }); }} style={s.btnPrimary}>
              Registrar pago
            </button>
          )}
        </div>
      </div>

      {actionError && <p style={s.error}>{actionError}</p>}

      {/* Info general */}
      <div style={s.grid3}>
        <div style={s.infoCard}>
          <span style={s.infoLabel}>Fecha emisión</span>
          <span style={s.infoVal}>{fmt.date(invoice.fecha)}</span>
        </div>
        <div style={s.infoCard}>
          <span style={s.infoLabel}>Fecha vencimiento</span>
          <span style={s.infoVal}>{fmt.date(invoice.fechaVencimiento)}</span>
        </div>
        <div style={s.infoCard}>
          <span style={s.infoLabel}>Notas</span>
          <span style={s.infoVal}>{invoice.notas || '—'}</span>
        </div>
      </div>

      {/* Líneas */}
      <div style={{ ...s.card, marginTop: '1rem' }}>
        <h2 style={s.sectionTitle}>Conceptos</h2>
        <table style={s.table}>
          <thead>
            <tr>
              {['Descripción', 'Cant.', 'Precio unit.', 'Importe'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} style={s.tr}>
                <td style={s.td}>{item.descripcion}</td>
                <td style={s.td}>{item.cantidad}</td>
                <td style={s.td}>{fmt.currency(item.precioUnitario)}</td>
                <td style={{ ...s.td, fontWeight: '600', textAlign: 'right' }}>{fmt.currency(item.importe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={s.totals}>
          <div style={s.totalRow}><span>Subtotal</span><span>{fmt.currency(invoice.subtotal)}</span></div>
          <div style={s.totalRow}><span>IVA (16%)</span><span>{fmt.currency(invoice.impuesto)}</span></div>
          <div style={{ ...s.totalRow, ...s.totalFinal }}><span>Total</span><span>{fmt.currency(invoice.total)}</span></div>
        </div>
      </div>

      {/* Pagos */}
      <div style={{ ...s.card, marginTop: '1rem' }}>
        <h2 style={s.sectionTitle}>Pagos registrados</h2>
        {invoice.payments.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Sin pagos registrados.</p>
        ) : (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Fecha', 'Monto', 'Método', 'Referencia'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} style={s.tr}>
                    <td style={s.td}>{fmt.date(p.fecha)}</td>
                    <td style={{ ...s.td, fontWeight: '600', color: '#166534' }}>{fmt.currency(p.monto)}</td>
                    <td style={s.td}>{p.metodo || '—'}</td>
                    <td style={s.td}>{p.referencia || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ ...s.totals, marginTop: '0.75rem' }}>
              <div style={s.totalRow}><span>Total pagado</span><span style={{ color: '#166534', fontWeight: '600' }}>{fmt.currency(totalPagado)}</span></div>
              {saldo > 0 && (
                <div style={{ ...s.totalRow, ...s.totalFinal, color: '#991b1b' }}>
                  <span>Saldo pendiente</span><span>{fmt.currency(saldo)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal pago */}
      {paymentModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal }}>
            <h2 style={s.modalTitle}>Registrar pago</h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#6b7280' }}>
              Saldo pendiente: <strong style={{ color: '#111827' }}>{fmt.currency(saldo)}</strong>
            </p>

            <div style={s.field}>
              <label style={s.label}>Monto *</label>
              <input type="number" min="0.01" step="0.01" style={s.input}
                value={payForm.monto} onChange={(e) => setPayForm({ ...payForm, monto: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Método de pago</label>
              <select style={s.input} value={payForm.metodo} onChange={(e) => setPayForm({ ...payForm, metodo: e.target.value })}>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Referencia</label>
              <input type="text" style={s.input} placeholder="Número de operación..."
                value={payForm.referencia} onChange={(e) => setPayForm({ ...payForm, referencia: e.target.value })} />
            </div>

            {payError && <p style={s.error}>{payError}</p>}

            <div style={s.modalActions}>
              <button onClick={() => setPaymentModal(false)} style={s.btnSecondary} disabled={paying}>Cancelar</button>
              <button onClick={handlePay} style={s.btnPrimary} disabled={paying}>
                {paying ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem' },
  folio: { margin: 0, fontSize: '1.75rem', fontFamily: 'monospace', color: '#111827' },
  clientName: { margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' },
  badge: { display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' },
  tipoBadge: { fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', letterSpacing: '0.05em' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
  infoCard: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  infoLabel: { fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' },
  infoVal: { fontSize: '0.875rem', color: '#111827' },
  card: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem' },
  sectionTitle: { margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '600', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f9fafb' },
  td: { padding: '0.75rem 0.75rem', fontSize: '0.875rem', color: '#374151' },
  totals: { marginTop: '0.75rem', marginLeft: 'auto', width: '220px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.875rem', color: '#374151' },
  totalFinal: { borderTop: '1px solid #e5e7eb', marginTop: '0.25rem', paddingTop: '0.5rem', fontWeight: '700', fontSize: '1rem', color: '#111827' },
  error: { color: '#dc2626', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px', margin: '0.5rem 0' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' },
  modalTitle: { margin: '0 0 0.75rem', fontSize: '1.125rem', color: '#111827' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.875rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: '#374151' },
  input: { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' },
  btnPrimary: { padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  btnSecondary: { padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
  btnAction: { padding: '0.5rem 1rem', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
};
