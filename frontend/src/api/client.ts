import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

const api = axios.create({ baseURL: apiBase });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  role: Role;
  classGroupId?: string;
  classGroup?: { id: string; name: string };
};
