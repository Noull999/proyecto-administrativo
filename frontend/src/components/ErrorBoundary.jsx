import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={s.wrap}>
        <div style={s.box}>
          <h2 style={s.title}>Algo salió mal</h2>
          <p style={s.msg}>{this.state.error?.message ?? 'Error inesperado.'}</p>
          <button style={s.btn} onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  box: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '2rem', maxWidth: '400px', textAlign: 'center' },
  title: { margin: '0 0 0.75rem', fontSize: '1.25rem', color: '#111827' },
  msg: { margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#6b7280' },
  btn: { padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
};
