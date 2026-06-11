import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useRole } from '../hooks/useRole';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  { value: 'ADMIN',    label: 'Admin',    desc: 'Acceso total' },
  { value: 'CONTABLE', label: 'Contable', desc: 'Crea y edita, no elimina' },
  { value: 'LECTOR',   label: 'Lector',   desc: 'Solo lectura' },
];

const ROLE_CLS = { ADMIN: 'badge-enviada', CONTABLE: 'badge-pagada', LECTOR: 'badge-borrador' };

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
    } finally { setLoading(false); }
  }, []);

  function openCreate() { setForm(emptyForm); setFormError(''); setModal('create'); }
  function openEdit(u) {
    setForm({ nombre: u.nombre, email: u.email, password: '', role: u.role });
    setFormError(''); setModal({ type: 'edit', id: u.id });
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    if (!form.email.trim()) { setFormError('El email es requerido'); return; }
    if (modal === 'create' && form.password.length < 6) { setFormError('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true); setFormError('');
    try {
      if (modal === 'create') await api.post('/users', form);
      else await api.put(`/users/${modal.id}`, { nombre: form.nombre, role: form.role });
      setModal(null); fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleDeactivate(id) {
    try { await api.delete(`/users/${id}`); setConfirmDeactivate(null); fetchUsers(); }
    catch (err) { alert(err.response?.data?.error || err.message); }
  }

  async function handleReactivate(id) {
    try { await api.put(`/users/${id}`, { activo: true }); fetchUsers(); }
    catch (err) { alert(err.response?.data?.error || err.message); }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Usuarios</h1>
        <button onClick={openCreate} className="btn btn-primary">+ Nuevo usuario</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.activo ? 1 : .45 }}>
                  <td><strong>{u.nombre}</strong></td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${ROLE_CLS[u.role] ?? 'badge-borrador'}`}>{u.role}</span></td>
                  <td>
                    <span style={{ fontSize: '.8rem', fontWeight: 500, color: u.activo ? '#4ade80' : 'var(--text-3)' }}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => openEdit(u)} className="btn btn-ghost btn-sm">Editar</button>
                    {u.activo ? (
                      <button onClick={() => setConfirmDeactivate(u)} className="btn btn-ghost btn-sm" style={{ marginLeft: '.4rem', color: '#fbbf24', borderColor: '#fbbf24' }}>
                        Desactivar
                      </button>
                    ) : (
                      <button onClick={() => handleReactivate(u.id)} className="btn btn-ghost btn-sm" style={{ marginLeft: '.4rem', color: '#4ade80', borderColor: '#4ade80' }}>
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '460px' }}>
            <h2 className="modal-title">{modal === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</h2>
            <div className="form-group">
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            {modal === 'create' && (
              <>
                <div className="form-group">
                  <label className="label">Email *</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Contraseña * (mín. 6 caracteres)</label>
                  <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="modal-actions">
              <button onClick={() => setModal(null)} className="btn btn-ghost" disabled={saving}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeactivate && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '380px' }}>
            <h2 className="modal-title">Desactivar usuario</h2>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-2)', fontSize: '.875rem' }}>
              ¿Desactivar a <strong style={{ color: 'var(--text)' }}>{confirmDeactivate.nombre}</strong>? No podrá iniciar sesión hasta que lo reactives.
            </p>
            <div className="modal-actions">
              <button onClick={() => setConfirmDeactivate(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={() => handleDeactivate(confirmDeactivate.id)} className="btn btn-primary" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>Desactivar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
