import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const emptyForm = { nombre: '', email: '', telefono: '', direccion: '', rfc: '' };

export default function Clients() {
  const api = useApi();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', { params: { search } });
      setClients(data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setModal('create');
  }

  function openEdit(client) {
    setForm({
      nombre: client.nombre,
      email: client.email || '',
      telefono: client.telefono || '',
      direccion: client.direccion || '',
      rfc: client.rfc || '',
    });
    setFormError('');
    setModal({ type: 'edit', id: client.id });
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (modal === 'create') {
        await api.post('/clients', form);
      } else {
        await api.put(`/clients/${modal.id}`, form);
      }
      setModal(null);
      fetchClients();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/clients/${id}`);
    setDeleteConfirm(null);
    fetchClients();
  }

  return (
    <div>
      <div style={s.header}>
        <h1 style={s.title}>Clientes</h1>
        <button onClick={openCreate} style={s.btnPrimary}>+ Nuevo cliente</button>
      </div>

      <div style={s.toolbar}>
        <input
          style={s.search}
          placeholder="Buscar por nombre, email o RFC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={s.empty}>Cargando...</p>
      ) : clients.length === 0 ? (
        <p style={s.empty}>{search ? 'Sin resultados.' : 'No hay clientes. ¡Crea el primero!'}</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              {['Nombre', 'Email', 'Teléfono', 'RFC', 'Acciones'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} style={s.tr}>
                <td style={s.td}><strong>{c.nombre}</strong></td>
                <td style={s.td}>{c.email || '—'}</td>
                <td style={s.td}>{c.telefono || '—'}</td>
                <td style={s.td}>{c.rfc || '—'}</td>
                <td style={s.td}>
                  <button onClick={() => openEdit(c)} style={s.btnAction}>Editar</button>
                  <button onClick={() => setDeleteConfirm(c)} style={{ ...s.btnAction, ...s.btnDanger }}>
                    Eliminar
                  </button>
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
              {modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
            </h2>

            {[
              { key: 'nombre', label: 'Nombre *', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'telefono', label: 'Teléfono', type: 'text' },
              { key: 'rfc', label: 'RFC / NIT', type: 'text' },
              { key: 'direccion', label: 'Dirección', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key} style={s.field}>
                <label style={s.label}>{label}</label>
                <input
                  type={type}
                  style={s.input}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}

            {formError && <p style={s.error}>{formError}</p>}

            <div style={s.modalActions}>
              <button onClick={() => setModal(null)} style={s.btnSecondary} disabled={saving}>
                Cancelar
              </button>
              <button onClick={handleSave} style={s.btnPrimary} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación eliminar */}
      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: '380px' }}>
            <h2 style={s.modalTitle}>Eliminar cliente</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#374151' }}>
              ¿Eliminar a <strong>{deleteConfirm.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={s.modalActions}>
              <button onClick={() => setDeleteConfirm(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={{ ...s.btnPrimary, backgroundColor: '#dc2626' }}>
                Eliminar
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
  toolbar: { marginBottom: '1rem' },
  search: {
    padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '0.875rem', width: '300px',
  },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#374151' },
  empty: { color: '#9ca3af', textAlign: 'center', margin: '3rem 0' },
  btnPrimary: { padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  btnSecondary: { padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
  btnAction: { padding: '0.25rem 0.625rem', background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.25rem', color: '#374151' },
  btnDanger: { borderColor: '#fca5a5', color: '#dc2626' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' },
  modalTitle: { margin: '0 0 1.25rem', fontSize: '1.125rem', color: '#111827' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.875rem' },
  label: { fontSize: '0.8rem', fontWeight: '500', color: '#374151' },
  input: { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' },
  error: { color: '#dc2626', fontSize: '0.8rem', margin: '0.25rem 0 0', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' },
};
