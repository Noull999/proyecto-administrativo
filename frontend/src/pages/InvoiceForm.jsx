import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fmt } from '../lib/format';

const TAX_RATE = 0.16;
function newLine() { return { productId: '', descripcion: '', cantidad: 1, precioUnitario: '', importe: 0 }; }

export default function InvoiceForm() {
  const api = useApi();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const tipoDefault = searchParams.get('tipo') || 'cotizacion';
  const isEdit = Boolean(id);

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [clientId, setClientId] = useState('');
  const [tipo, setTipo] = useState(tipoDefault);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [notas, setNotas] = useState('');
  const [lines, setLines] = useState([newLine()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/clients', { params: { all: 'true' } }),
      api.get('/products', { params: { activo: 'true', all: 'true' } }),
    ]).then(([c, p]) => {
      setClients(c.data);
      setProducts(p.data);
    });

    if (isEdit) {
      api.get(`/invoices/${id}`).then(({ data }) => {
        setClientId(String(data.clientId));
        setTipo(data.tipo);
        setFechaVencimiento(data.fechaVencimiento ? data.fechaVencimiento.slice(0, 10) : '');
        setNotas(data.notas || '');
        setLines(data.items.map(item => ({
          productId: item.productId ? String(item.productId) : '',
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          importe: item.importe,
        })));
      });
    }
  }, [id]);

  function updateLine(idx, field, value) {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      const cant = Number(field === 'cantidad' ? value : next[idx].cantidad) || 0;
      const precio = Number(field === 'precioUnitario' ? value : next[idx].precioUnitario) || 0;
      next[idx].importe = Math.round(cant * precio * 100) / 100;
      return next;
    });
  }

  function selectProduct(idx, productId) {
    const prod = products.find(p => String(p.id) === productId);
    setLines(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx], productId,
        descripcion: prod ? prod.nombre : next[idx].descripcion,
        precioUnitario: prod ? prod.precio : next[idx].precioUnitario,
        importe: prod ? Math.round(Number(next[idx].cantidad) * prod.precio * 100) / 100 : next[idx].importe,
      };
      return next;
    });
  }

  function addLine() { setLines(prev => [...prev, newLine()]); }
  function removeLine(idx) { setLines(prev => prev.filter((_, i) => i !== idx)); }

  const subtotal = lines.reduce((sum, l) => sum + (l.importe || 0), 0);
  const impuesto = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + impuesto) * 100) / 100;

  async function handleSave() {
    if (!clientId) { setError('Selecciona un cliente'); return; }
    const validLines = lines.filter(l => l.descripcion && Number(l.cantidad) > 0 && Number(l.precioUnitario) >= 0);
    if (validLines.length === 0) { setError('Agrega al menos una línea válida'); return; }
    setSaving(true); setError('');
    try {
      const payload = { clientId, tipo, fechaVencimiento, notas, items: validLines, taxRate: TAX_RATE };
      if (isEdit) await api.put(`/invoices/${id}`, payload);
      else await api.post('/invoices', payload);
      navigate('/invoices');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  const title = isEdit ? 'Editar' : tipo === 'factura' ? 'Nueva Factura' : 'Nueva Cotización';

  return (
    <div style={{ maxWidth: '860px' }}>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <button onClick={() => navigate('/invoices')} className="btn btn-ghost">← Volver</button>
      </div>

      {/* Datos generales */}
      <div className="card">
        <p style={s.sectionTitle}>Datos generales</p>
        <div style={s.grid2}>
          <div className="form-group">
            <label className="label">Tipo</label>
            <select className="input" value={tipo} onChange={e => setTipo(e.target.value)} disabled={isEdit}>
              <option value="cotizacion">Cotización</option>
              <option value="factura">Factura</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Cliente *</label>
            <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Fecha de vencimiento</label>
            <input type="date" className="input" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Notas</label>
            <input type="text" className="input" placeholder="Condiciones de pago, observaciones..." value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Líneas */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={s.sectionTitle}>Conceptos</p>
        <table style={s.linesTable}>
          <thead>
            <tr>
              <th style={s.lth}>Producto</th>
              <th style={s.lth}>Descripción *</th>
              <th style={{ ...s.lth, width: '70px' }}>Cant.</th>
              <th style={{ ...s.lth, width: '130px' }}>Precio unit.</th>
              <th style={{ ...s.lth, width: '110px', textAlign: 'right' }}>Importe</th>
              <th style={{ ...s.lth, width: '32px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={s.ltd}>
                  <select className="input" style={s.inputSm} value={line.productId} onChange={e => selectProduct(idx, e.target.value)}>
                    <option value="">—</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </td>
                <td style={s.ltd}>
                  <input className="input" style={s.inputSm} value={line.descripcion} onChange={e => updateLine(idx, 'descripcion', e.target.value)} placeholder="Descripción" />
                </td>
                <td style={s.ltd}>
                  <input type="number" min="0.01" step="0.01" className="input" style={s.inputSm} value={line.cantidad} onChange={e => updateLine(idx, 'cantidad', e.target.value)} />
                </td>
                <td style={s.ltd}>
                  <input type="number" min="0" step="0.01" className="input" style={s.inputSm} value={line.precioUnitario} onChange={e => updateLine(idx, 'precioUnitario', e.target.value)} placeholder="0.00" />
                </td>
                <td style={{ ...s.ltd, textAlign: 'right', fontWeight: '600', color: 'var(--text)', fontSize: '.85rem' }}>
                  {fmt.currency(line.importe)}
                </td>
                <td style={s.ltd}>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} style={s.removeBtn} title="Quitar">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addLine} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', borderColor: 'transparent', marginBottom: '.5rem' }}>
          + Agregar línea
        </button>

        <div style={s.totals}>
          <div style={s.totalRow}><span>Subtotal</span><span>{fmt.currency(subtotal)}</span></div>
          <div style={s.totalRow}><span>IVA (16%)</span><span>{fmt.currency(impuesto)}</span></div>
          <div style={{ ...s.totalRow, ...s.totalFinal }}><span>Total</span><span style={{ color: 'var(--text)' }}>{fmt.currency(total)}</span></div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '.75rem' }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem', marginTop: '1.5rem' }}>
        <button onClick={() => navigate('/invoices')} className="btn btn-ghost" disabled={saving}>Cancelar</button>
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar borrador'}
        </button>
      </div>
    </div>
  );
}

const s = {
  sectionTitle: { margin: '0 0 1rem', fontSize: '.72rem', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.875rem' },
  linesTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '.5rem' },
  lth: { padding: '.5rem .5rem', textAlign: 'left', fontSize: '.7rem', fontWeight: '600', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.04em' },
  ltd: { padding: '.4rem .35rem', verticalAlign: 'middle' },
  inputSm: { padding: '.35rem .5rem', fontSize: '.8rem', borderRadius: '4px', width: '100%' },
  removeBtn: { width: '24px', height: '24px', padding: 0, border: '1px solid rgba(220,38,38,.4)', borderRadius: '4px', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 },
  totals: { borderTop: '1px solid var(--border)', paddingTop: '.75rem', marginLeft: 'auto', width: '240px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '.2rem 0', fontSize: '.875rem', color: 'var(--text-2)' },
  totalFinal: { borderTop: '1px solid var(--border)', marginTop: '.25rem', paddingTop: '.5rem', fontWeight: '700', fontSize: '1rem' },
};
