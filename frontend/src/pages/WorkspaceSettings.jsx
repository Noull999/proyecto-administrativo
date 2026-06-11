import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { key: 'nombre',    label: 'Nombre de empresa *', type: 'text' },
  { key: 'rfc',       label: 'RFC / NIT',            type: 'text' },
  { key: 'telefono',  label: 'Teléfono',             type: 'text' },
  { key: 'direccion', label: 'Dirección',            type: 'text' },
];

export default function WorkspaceSettings() {
  const api = useApi();
  const { isAdmin } = useRole();
  const { user, login, token } = useAuth();
  const [form, setForm] = useState({ nombre: '', rfc: '', direccion: '', telefono: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/workspace').then(({ data }) => {
      setForm({ nombre: data.nombre || '', rfc: data.rfc || '', direccion: data.direccion || '', telefono: data.telefono || '' });
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre de empresa es requerido'); return; }
    setSaving(true); setError(''); setSuccess(false);
    try {
      const { data } = await api.put('/workspace', form);
      const updatedUser = { ...user, workspace: { ...user.workspace, nombre: data.nombre } };
      login({ token, user: updatedUser });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  if (loading) return <p style={{ color: 'var(--text-2)' }}>Cargando...</p>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Configuración de empresa</h1>

      <div className="card">
        <p style={s.sectionTitle}>Datos de la empresa</p>
        {FIELDS.map(({ key, label, type }) => (
          <div className="form-group" key={key}>
            <label className="label">{label}</label>
            <input
              type={type}
              className="input"
              style={!isAdmin ? { opacity: .55, cursor: 'not-allowed' } : {}}
              value={form[key]}
              onChange={e => setForm({ ...form, [key]: e.target.value })}
              disabled={!isAdmin}
            />
          </div>
        ))}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Cambios guardados correctamente.</div>}
        {isAdmin ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        ) : (
          <p style={{ color: 'var(--text-3)', fontSize: '.8rem', marginTop: '1rem' }}>
            Solo los administradores pueden modificar los datos de la empresa.
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={s.sectionTitle}>Información de cuenta</p>
        {[
          { label: 'Usuario', val: user?.nombre },
          { label: 'Email',   val: user?.email },
          { label: 'Rol',     val: user?.role },
        ].map(({ label, val }) => (
          <p key={label} style={{ margin: '0 0 .5rem', fontSize: '.875rem', color: 'var(--text-2)' }}>
            <strong style={{ color: 'var(--text)' }}>{label}:</strong> {val}
          </p>
        ))}
      </div>
    </div>
  );
}

const s = {
  sectionTitle: { margin: '0 0 1rem', fontSize: '.72rem', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' },
};
