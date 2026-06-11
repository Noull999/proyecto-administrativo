import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useRole } from '../hooks/useRole';

const emptyForm = { nombre: '', email: '', telefono: '', direccion: '', rfc: '' };
const FIELDS = [
  { key: 'nombre',   label: 'Nombre *',    type: 'text' },
  { key: 'email',    label: 'Email',        type: 'email' },
  { key: 'telefono', label: 'Teléfono',     type: 'text' },
  { key: 'rfc',      label: 'RFC / NIT',    type: 'text' },
  { key: 'direccion',label: 'Dirección',    type: 'text' },
];

export default function Clients() {
  const api = useApi();
  const { canWrite, isAdmin } = useRole();
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', { params: { search, page, limit: 20 } });
      setClients(data.data);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { setPage(1); }, [search]);

  function openCreate() { setForm(emptyForm); setFormError(''); setModal('create'); }
  function openEdit(c) {
    setForm({ nombre: c.nombre, email: c.email || '', telefono: c.telefono || '', direccion: c.direccion || '', rfc: c.rfc || '' });
    setFormError('');
    setModal({ type: 'edit', id: c.id });
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    setSaving(true); setFormError('');
    try {
      if (modal === 'create') await api.post('/clients', form);
      else await api.put(`/clients/${modal.id}`, form);
      setModal(null); fetchClients();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    await api.delete(`/clients/${id}`);
    setDeleteConfirm(null); fetchClients();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        {canWrite && <button onClick={openCreate} className="btn btn-primary">+ Nuevo cliente</button>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          className="input"
          style={{ maxWidth: '320px' }}
          placeholder="Buscar por nombre, email o RFC..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state">{search ? 'Sin resultados.' : 'No hay clientes aún. ¡Crea el primero!'}</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>RFC</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.nombre}</strong></td>
                  <td>{c.email || '—'}</td>
                  <td>{c.telefono || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{c.rfc || '—'}</td>
                  {canWrite && (
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="btn btn-ghost btn-sm">Editar</button>
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); setDeleteConfirm(c); }} className="btn btn-danger btn-sm" style={{ marginLeft: '.4rem' }}>Eliminar</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>Página {pagination.page} de {pagination.pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">{modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</h2>
            {FIELDS.map(({ key, label, type }) => (
              <div className="form-group" key={key}>
                <label className="label">{label}</label>
                <input type={type} className="input" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="modal-actions">
              <button onClick={() => setModal(null)} className="btn btn-ghost" disabled={saving}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '380px' }}>
            <h2 className="modal-title">Eliminar cliente</h2>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-2)', fontSize: '.875rem' }}>
              ¿Eliminar a <strong style={{ color: 'var(--text)' }}>{deleteConfirm.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn btn-primary" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
