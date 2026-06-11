import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

export default function AdminPanel() {
  const api = useApi();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ nombre: '', rfc: '', telefono: '', direccion: '', adminNombre: '', adminEmail: '', adminPassword: '' });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/workspaces');
      setWorkspaces(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const { data: created } = await api.post('/admin/workspaces', form);
      setWorkspaces(prev => [...prev, created]);
      setSuccess(`Empresa "${created.nombre}" creada exitosamente.`);
      setShowForm(false);
      setForm({ nombre: '', rfc: '', telefono: '', direccion: '', adminNombre: '', adminEmail: '', adminPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la empresa');
    } finally { setSaving(false); }
  }

  if (loading) return <p style={{ color: 'var(--text-2)' }}>Cargando empresas...</p>;

  return (
    <div style={{ maxWidth: '960px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Empresas</h1>
          <p className="page-sub">{workspaces.length} empresa{workspaces.length !== 1 ? 's' : ''} registrada{workspaces.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setSuccess(''); setError(''); }}>
          + Nueva empresa
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={s.formTitle}>Nueva empresa</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <p style={s.fieldsetLabel}>Datos de la empresa</p>
            <div className="form-row form-row-2">
              <Field label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} required />
              <Field label="RFC" name="rfc" value={form.rfc} onChange={handleChange} />
            </div>
            <div className="form-row form-row-2">
              <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} />
              <Field label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} />
            </div>

            <hr className="divider" />
            <p style={s.fieldsetLabel}>Usuario administrador inicial</p>
            <div className="form-row form-row-2">
              <Field label="Nombre del admin" name="adminNombre" value={form.adminNombre} onChange={handleChange} placeholder="Administrador" />
              <Field label="Email *" name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required />
            </div>
            <Field label="Contraseña *" name="adminPassword" type="password" value={form.adminPassword} onChange={handleChange} required />
            <p style={s.hint}>Mínimo 6 caracteres. El admin podrá cambiarla después.</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear empresa'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={s.grid}>
        {workspaces.map(ws => (
          <div key={ws.id} className="card">
            <div style={s.cardHeader}>
              <span style={s.cardName}>{ws.nombre}</span>
              <span style={s.cardId}>#{ws.id}</span>
            </div>
            {ws.rfc && <p style={s.cardMeta}>RFC: {ws.rfc}</p>}
            {ws.telefono && <p style={s.cardMeta}>{ws.telefono}</p>}
            <div style={s.stats}>
              <Stat label="Usuarios"  value={ws._count.users} />
              <Stat label="Clientes"  value={ws._count.clients} />
              <Stat label="Facturas"  value={ws._count.invoices} />
            </div>
            <p style={s.cardDate}>
              Desde {new Date(ws.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      <input name={name} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className="input" />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--accent)' }}>{value}</span>
      <span style={{ fontSize: '.68rem', color: 'var(--text-3)', marginTop: '2px' }}>{label}</span>
    </div>
  );
}

const s = {
  formTitle: { margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: '600', color: 'var(--text)' },
  fieldsetLabel: { margin: '0 0 .875rem', fontSize: '.72rem', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' },
  hint: { margin: '.5rem 0 0', fontSize: '.75rem', color: 'var(--text-3)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' },
  cardName: { fontWeight: '600', fontSize: '.95rem', color: 'var(--text)' },
  cardId: { fontSize: '.72rem', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '.1rem .4rem', borderRadius: '999px' },
  cardMeta: { margin: '0 0 .2rem', fontSize: '.78rem', color: 'var(--text-2)' },
  stats: { display: 'flex', gap: '.75rem', margin: '.75rem 0', padding: '.75rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' },
  cardDate: { margin: '.5rem 0 0', fontSize: '.72rem', color: 'var(--text-3)' },
};
