import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fmt } from '../lib/format';

const STATUS_CONFIG = {
  pagada:   { label: 'Pagada',   cls: 'badge-pagada' },
  enviada:  { label: 'Enviada',  cls: 'badge-enviada' },
  vencida:  { label: 'Vencida',  cls: 'badge-vencida' },
  borrador: { label: 'Borrador', cls: 'badge-borrador' },
};

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
  const [actionMsg, setActionMsg] = useState(null);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const totalPagado = invoice?.payments?.reduce((sum, p) => sum + p.monto, 0) ?? 0;
  const saldo = (invoice?.total ?? 0) - totalPagado;
  const estado = invoice?.estadoReal;
  const cfg = STATUS_CONFIG[estado] ?? STATUS_CONFIG.borrador;

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `${invoice.folio}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { setActionError('Error al generar el PDF'); }
    finally { setDownloading(false); }
  }

  async function handleAction(action) {
    setActionError(''); setActionMsg(null);
    try { await api.post(`/invoices/${id}/${action}`); load(); }
    catch (err) { setActionError(err.response?.data?.error || 'Error'); }
  }

  async function handleSend() {
    setActionError(''); setActionMsg(null); setSending(true);
    try {
      const { data } = await api.post(`/invoices/${id}/send`);
      if (data.email?.sent) {
        setActionMsg({ type: 'success', text: `Correo enviado a ${data.email.email} con el PDF adjunto.` });
      } else {
        setActionMsg({ type: 'warn', text: `Factura marcada como enviada, pero el correo no salió: ${data.email?.reason ?? 'motivo desconocido'}` });
      }
      load();
    } catch (err) { setActionError(err.response?.data?.error || 'Error al enviar'); }
    finally { setSending(false); }
  }

  async function handlePay() {
    if (!payForm.monto || isNaN(Number(payForm.monto)) || Number(payForm.monto) <= 0) {
      setPayError('El monto debe ser un número positivo'); return;
    }
    setPaying(true); setPayError('');
    try {
      await api.post(`/invoices/${id}/payments`, payForm);
      setPaymentModal(false);
      setPayForm({ monto: '', metodo: 'transferencia', referencia: '' });
      load();
    } catch (err) { setPayError(err.response?.data?.error || 'Error al registrar pago'); }
    finally { setPaying(false); }
  }

  if (loading) return <p style={{ color: 'var(--text-2)' }}>Cargando...</p>;
  if (!invoice) return <p style={{ color: 'var(--accent)' }}>Factura no encontrada.</p>;

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
            <h1 style={s.folio}>{invoice.folio}</h1>
            <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
            <span style={s.tipoBadge}>{invoice.tipo === 'factura' ? 'FACTURA' : 'COTIZACIÓN'}</span>
          </div>
          <p style={s.clientName}>{invoice.client?.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/invoices')} className="btn btn-ghost btn-sm">← Volver</button>
          <button onClick={handleDownloadPdf} className="btn btn-secondary btn-sm" disabled={downloading}>
            {downloading ? 'Generando...' : 'PDF'}
          </button>
          {estado !== 'pagada' && (
            <button onClick={() => navigate(`/invoices/${id}/edit`)} className="btn btn-secondary btn-sm">Editar</button>
          )}
          {estado !== 'pagada' && (
            <button onClick={handleSend} className="btn btn-primary btn-sm" disabled={sending}>
              {sending ? 'Enviando...' : estado === 'borrador' ? 'Enviar al cliente' : 'Reenviar correo'}
            </button>
          )}
          {invoice.tipo === 'cotizacion' && estado !== 'pagada' && (
            <button onClick={() => handleAction('convert')} className="btn btn-ghost btn-sm" style={{ color: '#4ade80', borderColor: '#4ade80' }}>
              → Convertir a Factura
            </button>
          )}
          {estado !== 'pagada' && (
            <button
              onClick={() => { setPaymentModal(true); setPayForm({ monto: String(Math.max(0, saldo).toFixed(2)), metodo: 'transferencia', referencia: '' }); }}
              className="btn btn-primary btn-sm"
            >
              + Pago
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}
      {actionMsg && (
        <div className={`alert ${actionMsg.type === 'success' ? 'alert-success' : 'alert-warn'}`}>
          {actionMsg.text}
        </div>
      )}
      {invoice.client?.email
        ? <p style={s.emailHint}>Correo de envío: <strong style={{ color: 'var(--text)' }}>{invoice.client.email}</strong></p>
        : <div className="alert alert-warn" style={{ marginBottom: '.75rem' }}>Este cliente no tiene correo registrado. Edítalo en Clientes para poder enviar la factura.</div>
      }

      {/* Info */}
      <div style={s.grid3}>
        {[
          { label: 'Fecha emisión',     val: fmt.date(invoice.fecha) },
          { label: 'Fecha vencimiento', val: fmt.date(invoice.fechaVencimiento) },
          { label: 'Notas',             val: invoice.notas || '—' },
        ].map(({ label, val }) => (
          <div key={label} className="card" style={s.infoCell}>
            <span style={s.infoLabel}>{label}</span>
            <span style={s.infoVal}>{val}</span>
          </div>
        ))}
      </div>

      {/* Conceptos */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={s.sectionTitle}>Conceptos</p>
        <table className="tbl">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Precio unit.</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map(item => (
              <tr key={item.id}>
                <td>{item.descripcion}</td>
                <td>{item.cantidad}</td>
                <td>{fmt.currency(item.precioUnitario)}</td>
                <td style={{ textAlign: 'right' }}><strong style={{ color: 'var(--text)' }}>{fmt.currency(item.importe)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={s.totals}>
          <div style={s.totalRow}><span>Subtotal</span><span>{fmt.currency(invoice.subtotal)}</span></div>
          <div style={s.totalRow}><span>IVA (16%)</span><span>{fmt.currency(invoice.impuesto)}</span></div>
          <div style={{ ...s.totalRow, ...s.totalFinal }}><span>Total</span><span style={{ color: 'var(--text)' }}>{fmt.currency(invoice.total)}</span></div>
        </div>
      </div>

      {/* Pagos */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={s.sectionTitle}>Pagos registrados</p>
        {invoice.payments.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '.875rem', margin: 0 }}>Sin pagos registrados.</p>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fecha</th><th>Monto</th><th>Método</th><th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map(p => (
                  <tr key={p.id}>
                    <td>{fmt.date(p.fecha)}</td>
                    <td><strong style={{ color: '#4ade80' }}>{fmt.currency(p.monto)}</strong></td>
                    <td>{p.metodo || '—'}</td>
                    <td>{p.referencia || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={s.totals}>
              <div style={s.totalRow}><span>Total pagado</span><span style={{ color: '#4ade80', fontWeight: '600' }}>{fmt.currency(totalPagado)}</span></div>
              {saldo > 0 && (
                <div style={{ ...s.totalRow, ...s.totalFinal }}><span>Saldo pendiente</span><span style={{ color: 'var(--accent)' }}>{fmt.currency(saldo)}</span></div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal pago */}
      {paymentModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <h2 className="modal-title">Registrar pago</h2>
            <p style={{ margin: '0 0 1rem', fontSize: '.8rem', color: 'var(--text-2)' }}>
              Saldo pendiente: <strong style={{ color: 'var(--text)' }}>{fmt.currency(saldo)}</strong>
            </p>
            <div className="form-group">
              <label className="label">Monto *</label>
              <input type="number" min="0.01" step="0.01" className="input" value={payForm.monto} onChange={e => setPayForm({ ...payForm, monto: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Método de pago</label>
              <select className="input" value={payForm.metodo} onChange={e => setPayForm({ ...payForm, metodo: e.target.value })}>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Referencia</label>
              <input type="text" className="input" placeholder="Número de operación..." value={payForm.referencia} onChange={e => setPayForm({ ...payForm, referencia: e.target.value })} />
            </div>
            {payError && <div className="alert alert-error">{payError}</div>}
            <div className="modal-actions">
              <button onClick={() => setPaymentModal(false)} className="btn btn-ghost" disabled={paying}>Cancelar</button>
              <button onClick={handlePay} className="btn btn-primary" disabled={paying}>{paying ? 'Registrando...' : 'Confirmar pago'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' },
  folio: { margin: 0, fontSize: '1.6rem', fontFamily: 'monospace', color: 'var(--text)', fontWeight: '700' },
  clientName: { margin: '.25rem 0 0', color: 'var(--text-2)', fontSize: '.9rem' },
  tipoBadge: { fontSize: '.65rem', fontWeight: '700', color: 'var(--text-3)', letterSpacing: '.06em' },
  emailHint: { fontSize: '.78rem', color: 'var(--text-2)', margin: '0 0 .75rem' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' },
  infoCell: { display: 'flex', flexDirection: 'column', gap: '.25rem', padding: '.875rem' },
  infoLabel: { fontSize: '.68rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '.05em' },
  infoVal: { fontSize: '.875rem', color: 'var(--text)' },
  sectionTitle: { margin: '0 0 .875rem', fontSize: '.7rem', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' },
  totals: { marginTop: '.75rem', marginLeft: 'auto', width: '220px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '.2rem 0', fontSize: '.875rem', color: 'var(--text-2)' },
  totalFinal: { borderTop: '1px solid var(--border)', marginTop: '.25rem', paddingTop: '.5rem', fontWeight: '700', fontSize: '1rem' },
};
