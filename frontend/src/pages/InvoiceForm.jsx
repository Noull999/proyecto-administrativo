import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { fmt } from '../lib/format';

const TAX_RATE = 0.16;

function newLine() {
  return { productId: '', descripcion: '', cantidad: 1, precioUnitario: '', importe: 0 };
}

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
      api.get('/clients'),
      api.get('/products', { params: { activo: 'true' } }),
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
        setLines(
          data.items.map((item) => ({
            productId: item.productId ? String(item.productId) : '',
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            importe: item.importe,
          }))
        );
      });
    }
  }, [id]);

  function updateLine(idx, field, value) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      const cant = Number(field === 'cantidad' ? value : next[idx].cantidad) || 0;
      const precio = Number(field === 'precioUnitario' ? value : next[idx].precioUnitario) || 0;
      next[idx].importe = Math.round(cant * precio * 100) / 100;
      return next;
    });
  }

  function selectProduct(idx, productId) {
    const prod = products.find((p) => String(p.id) === productId);
    setLines((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        productId,
        descripcion: prod ? prod.nombre : next[idx].descripcion,
        precioUnitario: prod ? prod.precio : next[idx].precioUnitario,
        importe: prod
          ? Math.round(Number(next[idx].cantidad) * prod.precio * 100) / 100
          : next[idx].importe,
      };
      return next;
    });
  }

  function addLine() { setLines((prev) => [...prev, newLine()]); }
  function removeLine(idx) { setLines((prev) => prev.filter((_, i) => i !== idx)); }

  const subtotal = lines.reduce((sum, l) => sum + (l.importe || 0), 0);
  const impuesto = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + impuesto) * 100) / 100;

  async function handleSave() {
    if (!clientId) { setError('Selecciona un cliente'); return; }
    const validLines = lines.filter((l) => l.descripcion && Number(l.cantidad) > 0 && Number(l.precioUnitario) >= 0);
    if (validLines.length === 0) { setError('Agrega al menos una línea válida'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = { clientId, tipo, fechaVencimiento, notas, items: validLines, taxRate: TAX_RATE };
      if (isEdit) {
        await api.put(`/invoices/${id}`, payload);
      } else {
        await api.post('/invoices', payload);
      }
      navigate('/invoices');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const title = isEdit ? 'Editar' : tipo === 'factura' ? 'Nueva Factura' : 'Nueva Cotización';

  return (
    <div style={{ maxWidth: '860px' }}>
      <div style={s.header}>
        <h1 style={s.title}>{title}</h1>
        <button onClick={() => navigate('/invoices')} style={s.btnSecondary}>← Volver</button>
      </div>

      {/* Encabezado */}
      <div style={s.card}>
        <h2 style={s.sectionTitle}>Datos generales</h2>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Tipo</label>
            <select
              style={s.input}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={isEdit}
            >
              <option value="cotizacion">Cotización</option>
              <option value="factura">Factura</option>
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Cliente *</label>
            <select
              style={s.input}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">-- Seleccionar --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Fecha de vencimiento</label>
            <input
              type="date"
              style={s.input}
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Notas</label>
            <input
              type="text"
              style={s.input}
              placeholder="Condiciones de pago, observaciones..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Líneas */}
      <div style={{ ...s.card, marginTop: '1rem' }}>
        <h2 style={s.sectionTitle}>Conceptos</h2>

        <table style={s.linesTable}>
          <thead>
            <tr>
              <th style={s.lth}>Producto (opcional)</th>
              <th style={s.lth}>Descripción *</th>
              <th style={{ ...s.lth, width: '80px' }}>Cant.</th>
              <th style={{ ...s.lth, width: '130px' }}>Precio unit.</th>
              <th style={{ ...s.lth, width: '110px', textAlign: 'right' }}>Importe</th>
              <th style={{ ...s.lth, width: '36px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td style={s.ltd}>
                  <select
                    style={s.inputSm}
                    value={line.productId}
                    onChange={(e) => selectProduct(idx, e.target.value)}
                  >
                    <option value="">—</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </td>
                <td style={s.ltd}>
                  <input
                    style={s.inputSm}
                    value={line.descripcion}
                    onChange={(e) => updateLine(idx, 'descripcion', e.target.value)}
                    placeholder="Descripción del servicio"
                  />
                </td>
                <td style={s.ltd}>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    style={s.inputSm}
                    value={line.cantidad}
                    onChange={(e) => updateLine(idx, 'cantidad', e.target.value)}
                  />
                </td>
                <td style={s.ltd}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={s.inputSm}
                    value={line.precioUnitario}
                    onChange={(e) => updateLine(idx, 'precioUnitario', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td style={{ ...s.ltd, textAlign: 'right', fontWeight: '600' }}>
                  {fmt.currency(line.importe)}
                </td>
                <td style={s.ltd}>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} style={s.removeBtn} title="Quitar línea">
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addLine} style={s.addLineBtn}>+ Agregar línea</button>

        {/* Totales */}
        <div style={s.totals}>
          <div style={s.totalRow}>
            <span>Subtotal</span>
            <span>{fmt.currency(subtotal)}</span>
          </div>
          <div style={s.totalRow}>
            <span>IVA (16%)</span>
            <span>{fmt.currency(impuesto)}</span>
          </div>
          <div style={{ ...s.totalRow, ...s.totalFinal }}>
            <span>Total</span>
            <span>{fmt.currency(total)}</span>
          </div>
        </div>
      </div>

      {error && <p style={s.error}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button onClick={() => navigate('/invoices')} style={s.btnSecondary} disabled={saving}>
          Cancelar
        </button>
        <button onClick={handleSave} style={s.btnPrimary} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar borrador'}
        </button>
      </div>
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { margin: 0, fontSize: '1.5rem', color: '#111827' },
  card: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem' },
  sectionTitle: { margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: '#374151' },
  input: { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' },
  inputSm: { padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8rem', width: '100%', backgroundColor: '#fff' },
  linesTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem' },
  lth: { padding: '0.5rem 0.5rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' },
  ltd: { padding: '0.4rem 0.5rem', verticalAlign: 'middle' },
  removeBtn: { width: '24px', height: '24px', padding: 0, border: '1px solid #fca5a5', borderRadius: '4px', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 },
  addLineBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem 0', marginBottom: '1rem' },
  totals: { borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', marginLeft: 'auto', width: '240px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.875rem', color: '#374151' },
  totalFinal: { borderTop: '1px solid #e5e7eb', marginTop: '0.25rem', paddingTop: '0.5rem', fontWeight: '700', fontSize: '1rem', color: '#111827' },
  error: { color: '#dc2626', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px', marginTop: '0.75rem' },
  btnPrimary: { padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  btnSecondary: { padding: '0.5rem 1.25rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
};
