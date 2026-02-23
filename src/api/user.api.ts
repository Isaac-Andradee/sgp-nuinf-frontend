import { api } from './client';
import type { UserResponse, CreateUserRequest, UpdateUserRequest, PagedResponse } from '../types';

export const userApi = {
  list: (page = 0, size = 10) =>
    api.get<PagedResponse<UserResponse>>('/users', { params: { page, size } }).then(r => r.data),

  get: (id: string) =>
    api.get<UserResponse>(`/users/${id}`).then(r => r.data),

  create: (data: CreateUserRequest) =>
    api.post<UserResponse>('/users', data).then(r => r.data),

  update: (id: string, data: UpdateUserRequest) =>
    api.put<UserResponse>(`/users/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/users/${id}`).then(r => r.data),
};
