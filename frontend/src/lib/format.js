export const fmt = {
  currency: (n) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0),

  date: (d) =>
    d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
};

export const STATUS_LABEL = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  pagada: 'Pagada',
  vencida: 'Vencida',
};

export const STATUS_STYLE = {
  borrador: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  enviada:  { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  pagada:   { backgroundColor: '#dcfce7', color: '#166534' },
  vencida:  { backgroundColor: '#fee2e2', color: '#991b1b' },
};
