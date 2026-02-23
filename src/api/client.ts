import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const currentPath = window.location.pathname;

    // 503 Service Unavailable → sistema em manutenção (replace para não depender só do reload)
    if (status === 503 && currentPath !== '/maintenance') {
      window.location.replace('/maintenance');
      return Promise.reject(error);
    }

    // 401 Unauthorized → sessão expirada ou não autenticado
    if (status === 401) {
      const isPublicPage = currentPath === '/login'
        || currentPath === '/setup'
        || currentPath === '/maintenance';
      if (!isPublicPage) {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  }
);
