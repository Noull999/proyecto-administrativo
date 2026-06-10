import { useAuth } from '../context/AuthContext';

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? 'LECTOR';
  return {
    role,
    isAdmin: role === 'ADMIN',
    canWrite: role === 'ADMIN' || role === 'CONTABLE',
    isLector: role === 'LECTOR',
  };
}
