import { useAuth } from '../context/AuthContext';

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? 'LECTOR';
  return {
    role,
    isSuperAdmin: role === 'SUPERADMIN',
    isAdmin: role === 'ADMIN' || role === 'SUPERADMIN',
    canWrite: role === 'ADMIN' || role === 'CONTABLE' || role === 'SUPERADMIN',
    isLector: role === 'LECTOR',
  };
}
