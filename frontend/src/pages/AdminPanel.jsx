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

  const [form, setForm] = useState({
    nombre: '',
    rfc: '',
    telefono: '',
    direccion: '',
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/workspaces');
      setWorkspaces(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: created } = await api.post('/admin/workspaces', form);
      setWorkspaces(prev => [...prev, created]);
      setSuccess(`Empresa "${created.nombre}" creada exitosamente.`);
      setShowForm(false);
      setForm({ nombre: '', rfc: '', telefono: '', direccion: '', adminNombre: '', adminEmail: '', adminPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la empresa');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: '#6b7280' }}>Cargando empresas...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Panel de Empresas</h1>
          <p style={s.subtitle}>{workspaces.length} empresa{workspaces.length !== 1 ? 's' : ''} registrada{workspaces.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={s.btnPrimary} onClick={() => { setShowForm(true); setSuccess(''); setError(''); }}>
          + Nueva empresa
        </button>
      </div>

      {success && <div style={s.alertSuccess}>{success}</div>}

      {showForm && (
        <div style={s.formCard}>
          <h2 style={s.formTitle}>Nueva empresa</h2>
          {error && <div style={s.alertError}>{error}</div>}
          <form onSubmit={handleSubmit} style={s.form}>
            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Datos de la empresa</legend>
              <div style={s.row}>
                <Field label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} required />
                <Field label="RFC" name="rfc" value={form.rfc} onChange={handleChange} />
              </div>
              <div style={s.row}>
                <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} />
                <Field label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} />
              </div>
            </fieldset>

            <fieldset style={s.fieldset}>
              <legend style={s.legend}>Usuario administrador inicial</legend>
              <div style={s.row}>
                <Field label="Nombre del admin" name="adminNombre" value={form.adminNombre} onChange={handleChange} placeholder="Administrador" />
                <Field label="Email *" name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required />
              </div>
              <Field label="Contraseña *" name="adminPassword" type="password" value={form.adminPassword} onChange={handleChange} required />
              <p style={s.hint}>Mínimo 6 caracteres. El admin podrá cambiarla después.</p>
            </fieldset>

            <div style={s.formActions}>
              <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" style={s.btnPrimary} disabled={saving}>
                {saving ? 'Creando...' : 'Crear empresa'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={s.grid}>
        {workspaces.map(ws => (
          <div key={ws.id} style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardName}>{ws.nombre}</span>
              <span style={s.cardId}>#{ws.id}</span>
            </div>
            {ws.rfc && <p style={s.cardMeta}>RFC: {ws.rfc}</p>}
            {ws.telefono && <p style={s.cardMeta}>{ws.telefono}</p>}
            <div style={s.stats}>
              <Stat label="Usuarios" value={ws._count.users} />
              <Stat label="Clientes" value={ws._count.clients} />
              <Stat label="Facturas" value={ws._count.invoices} />
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
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        style={s.input}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={s.stat}>
      <span style={s.statValue}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

const s = {
  page: { maxWidth: '960px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: '#111827' },
  subtitle: { margin: 0, fontSize: '0.875rem', color: '#6b7280' },
  btnPrimary: { padding: '0.5rem 1rem', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' },
  btnCancel: { padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' },
  alertSuccess: { marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '0.875rem' },
  alertError: { marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.875rem' },
  formCard: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' },
  formTitle: { margin: '0 0 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#111827' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  fieldset: { border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1rem', margin: 0 },
  legend: { fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', padding: '0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: '0.875rem', fontWeight: '500', color: '#374151' },
  input: { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', color: '#111827', outline: 'none' },
  hint: { margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#9ca3af' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' },
  cardName: { fontWeight: '600', fontSize: '1rem', color: '#111827' },
  cardId: { fontSize: '0.75rem', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '0.125rem 0.5rem', borderRadius: '9999px' },
  cardMeta: { margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#6b7280' },
  stats: { display: 'flex', gap: '1rem', margin: '0.75rem 0', padding: '0.75rem 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  statValue: { fontWeight: '700', fontSize: '1.125rem', color: '#7c3aed' },
  statLabel: { fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' },
  cardDate: { margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#9ca3af' },
};
