import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useRole } from '../hooks/useRole';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  { value: 'ADMIN', label: 'Admin', desc: 'Acceso total' },
  { value: 'CONTABLE', label: 'Contable', desc: 'Crea y edita, no elimina' },
  { value: 'LECTOR', label: 'Lector', desc: 'Solo lectura' },
];
const ROLE_COLOR = { ADMIN: '#2563eb', CONTABLE: '#059669', LECTOR: '#6b7280' };

const emptyForm = { nombre: '', email: '', password: '', role: 'LECTOR' };

export default function Users() {
  const api = useApi();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setModal('create');
  }

  function openEdit(user) {
    setForm({ nombre: user.nombre, email: user.email, password: '', role: user.role });
    setFormError('');
    setModal({ type: 'edit', id: user.id });
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    if (!form.email.trim()) { setFormError('El email es requerido'); return; }
    if (modal === 'create' && form.password.length < 6) { setFormError('La contraseña debe tener al menos 6 caracteres'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (modal === 'create') {
        await api.post('/users', form);
      } else {
        const payload = { nombre: form.nombre, role: form.role };
        await api.put(`/users/${modal.id}`, payload);
      }
      setModal(null);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    try {
      await api.delete(`/users/${id}`);
      setConfirmDeactivate(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  async function handleReactivate(id) {
    try {
      await api.put(`/users/${id}`, { activo: true });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  return (
    <div>
      <div style={s.header}>
        <h1 style={s.title}>Usuarios</h1>
        <button onClick={openCreate} style={s.btnPrimary}>+ Nuevo usuario</button>
      </div>

      {loading ? (
        <p style={s.empty}>Cargando...</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ ...s.tr, opacity: u.activo ? 1 : 0.5 }}>
                <td style={s.td}><strong>{u.nombre}</strong></td>
                <td style={s.td}>{u.email}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, backgroundColor: ROLE_COLOR[u.role] }}>
                    {u.role}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ color: u.activo ? '#059669' : '#dc2626', fontWeight: 500, fontSize: '0.8rem' }}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={s.td}>
                  <button onClick={() => openEdit(u)} style={s.btnAction}>Editar</button>
                  {u.activo ? (
                    <button onClick={() => setConfirmDeactivate(u)} style={{ ...s.btnAction, ...s.btnDanger }}>
                      Desactivar
                    </button>
                  ) : (
                    <button onClick={() => handleReactivate(u.id)} style={{ ...s.btnAction, color: '#059669', borderColor: '#6ee7b7' }}>
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>
              {modal === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
            </h2>

            <div style={s.field}>
              <label style={s.label}>Nombre *</label>
              <input style={s.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>

            {modal === 'create' && (
              <div style={s.field}>
                <label style={s.label}>Email *</label>
                <input type="email" style={s.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            )}

            {modal === 'create' && (
              <div style={s.field}>
                <label style={s.label}>Contraseña * (mín. 6 caracteres)</label>
                <input type="password" style={s.input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}

            <div style={s.field}>
              <label style={s.label}>Rol</label>
              <select style={s.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                ))}
              </select>
            </div>

            {formError && <p style={s.error}>{formError}</p>}

            <div style={s.modalActions}>
              <button onClick={() => setModal(null)} style={s.btnSecondary} disabled={saving}>Cancelar</button>
              <button onClick={handleSave} style={s.btnPrimary} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación desactivar */}
      {confirmDeactivate && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: '380px' }}>
            <h2 style={s.modalTitle}>Desactivar usuario</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#374151' }}>
              ¿Desactivar a <strong>{confirmDeactivate.nombre}</strong>? No podrá iniciar sesión hasta que lo reactives.
            </p>
            <div style={s.modalActions}>
              <button onClick={() => setConfirmDeactivate(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={() => handleDeactivate(confirmDeactivate.id)} style={{ ...s.btnPrimary, backgroundColor: '#dc2626' }}>
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { margin: 0, fontSize: '1.5rem', color: '#111827' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#374151' },
  empty: { color: '#9ca3af', textAlign: 'center', margin: '3rem 0' },
  badge: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', color: '#fff', fontWeight: '600' },
  btnPrimary: { padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  btnSecondary: { padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
  btnAction: { padding: '0.25rem 0.625rem', background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.25rem', color: '#374151' },
  btnDanger: { borderColor: '#fca5a5', color: '#dc2626' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' },
  modalTitle: { margin: '0 0 1.25rem', fontSize: '1.125rem', color: '#111827' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.875rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: '#374151' },
  input: { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' },
  error: { color: '#dc2626', fontSize: '0.8rem', margin: '0.25rem 0 0', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' },
};
