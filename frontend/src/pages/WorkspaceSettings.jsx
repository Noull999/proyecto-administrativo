import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../context/AuthContext';

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
      setForm({
        nombre: data.nombre || '',
        rfc: data.rfc || '',
        direccion: data.direccion || '',
        telefono: data.telefono || '',
      });
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre de empresa es requerido'); return; }
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const { data } = await api.put('/workspace', form);
      // Actualizar el nombre del workspace en la sesión local
      const updatedUser = { ...user, workspace: { ...user.workspace, nombre: data.nombre } };
      login({ token, user: updatedUser });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: '#9ca3af' }}>Cargando...</p>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>Configuración de empresa</h1>

      <div style={s.card}>
        <h2 style={s.section}>Datos de la empresa</h2>

        {[
          { key: 'nombre', label: 'Nombre de empresa *', type: 'text' },
          { key: 'rfc', label: 'RFC / NIT', type: 'text' },
          { key: 'telefono', label: 'Teléfono', type: 'text' },
          { key: 'direccion', label: 'Dirección', type: 'text' },
        ].map(({ key, label, type }) => (
          <div key={key} style={s.field}>
            <label style={s.label}>{label}</label>
            <input
              type={type}
              style={{ ...s.input, ...(isAdmin ? {} : s.inputDisabled) }}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              disabled={!isAdmin}
            />
          </div>
        ))}

        {error && <p style={s.error}>{error}</p>}
        {success && <p style={s.success}>Cambios guardados correctamente.</p>}

        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={handleSave} style={s.btnPrimary} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {!isAdmin && (
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '1rem' }}>
            Solo los administradores pueden modificar los datos de la empresa.
          </p>
        )}
      </div>

      <div style={{ ...s.card, marginTop: '1rem' }}>
        <h2 style={s.section}>Información de cuenta</h2>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
          <strong>Usuario:</strong> {user?.nombre}
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#374151' }}>
          <strong>Email:</strong> {user?.email}
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#374151' }}>
          <strong>Rol:</strong> {user?.role}
        </p>
      </div>
    </div>
  );
}

const s = {
  card: { backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  section: { margin: '0 0 1.25rem', fontSize: '1rem', color: '#374151', fontWeight: '600' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.875rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: '#374151' },
  input: { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' },
  inputDisabled: { backgroundColor: '#f9fafb', color: '#6b7280' },
  btnPrimary: { padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  error: { color: '#dc2626', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px', margin: '0.25rem 0 0' },
  success: { color: '#059669', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '4px', margin: '0.25rem 0 0' },
};
