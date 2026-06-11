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
  borrador: { backgroundColor: 'rgba(255,255,255,.06)', color: '#888' },
  enviada:  { backgroundColor: 'rgba(59,130,246,.12)',  color: '#60a5fa' },
  pagada:   { backgroundColor: 'rgba(34,197,94,.12)',   color: '#4ade80' },
  vencida:  { backgroundColor: 'rgba(239,68,68,.12)',   color: '#f87171' },
};
