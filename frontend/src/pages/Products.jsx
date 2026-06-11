import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useRole } from '../hooks/useRole';
import { fmt } from '../lib/format';

const emptyForm = { nombre: '', descripcion: '', precio: '' };

export default function Products() {
  const api = useApi();
  const { canWrite } = useRole();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', { params: { search, page, limit: 20 } });
      setProducts(data.data);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search]);

  function openCreate() { setForm(emptyForm); setFormError(''); setModal('create'); }
  function openEdit(p) {
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: String(p.precio) });
    setFormError(''); setModal({ type: 'edit', id: p.id });
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido'); return; }
    if (!form.precio || isNaN(Number(form.precio)) || Number(form.precio) < 0) {
      setFormError('El precio debe ser un número positivo'); return;
    }
    setSaving(true); setFormError('');
    try {
      if (modal === 'create') await api.post('/products', form);
      else await api.put(`/products/${modal.id}`, form);
      setModal(null); fetchProducts();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleToggle(product) {
    await api.patch(`/products/${product.id}/toggle`);
    fetchProducts();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Productos y Servicios</h1>
        {canWrite && <button onClick={openCreate} className="btn btn-primary">+ Nuevo producto</button>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          className="input"
          style={{ maxWidth: '320px' }}
          placeholder="Buscar por nombre o descripción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: 'var(--radius)' }} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">{search ? 'Sin resultados.' : 'No hay productos aún. ¡Crea el primero!'}</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Estado</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ opacity: p.activo ? 1 : .45 }}>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.descripcion || '—'}</td>
                  <td><strong style={{ color: 'var(--text)' }}>{fmt.currency(p.precio)}</strong></td>
                  <td>
                    <span className={`badge ${p.activo ? 'badge-pagada' : 'badge-borrador'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canWrite && (
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); openEdit(p); }} className="btn btn-ghost btn-sm">Editar</button>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggle(p); }}
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: '.4rem', color: p.activo ? '#fbbf24' : '#4ade80' }}
                      >
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
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

      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '420px' }}>
            <h2 className="modal-title">{modal === 'create' ? 'Nuevo producto' : 'Editar producto'}</h2>
            <div className="form-group">
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Descripción</label>
              <input className="input" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Precio *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} />
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="modal-actions">
              <button onClick={() => setModal(null)} className="btn btn-ghost" disabled={saving}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
