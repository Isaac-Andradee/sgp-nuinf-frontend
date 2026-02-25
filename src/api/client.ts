import axios from 'axios';
import { toast } from 'sonner';

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

    // 401 Unauthorized → sessão expirada, conta desativada ou não autenticado.
    // O backend identifica o dono do token (JWT) em cada requisição; se esse usuário estiver
    // com enabled=false, responde 401 (ex.: "Conta desativada. Acesso não autorizado.").
    if (status === 401) {
      const message = error.response?.data?.message as string | undefined;
      if (message) toast.error(message);
      const isPublicPage = currentPath === '/login'
        || currentPath === '/setup'
        || currentPath === '/maintenance';
      const isContaDesativadaPage = currentPath === '/conta-desativada';
      if (!isPublicPage && !isContaDesativadaPage) {
        const isContaDesativada = typeof message === 'string' && message.toLowerCase().includes('desativad');
        window.location.replace(isContaDesativada ? '/conta-desativada' : '/login');
      }
    }

    return Promise.reject(error);
  }
);
