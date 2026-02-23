import { api } from './client';
import type { LoginRequest, LoginResponse, SetupRequest, UserResponse, ChangePasswordRequest } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data).then(r => r.data),

  logout: () =>
    api.post('/auth/logout').then(r => r.data),

  me: () =>
    api.get<UserResponse>('/auth/me').then(r => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', null, { params: { email } }).then(r => r.data),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', null, { params: { token, password } }).then(r => r.data),

  setup: (data: SetupRequest) =>
    api.post('/setup', data, { baseURL: import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? 'http://localhost:8081' }).then(r => r.data),

  changePassword: (userId: string, data: ChangePasswordRequest) =>
    api.post(`/users/${userId}/change-password`, data).then(r => r.data),
};
