import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE = 'http://localhost:3001/api';

export function useApi() {
  const { token, logout } = useAuth();

  const client = axios.create({ baseURL: BASE });

  client.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) logout();
      return Promise.reject(err);
    }
  );

  return client;
}
