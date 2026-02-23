import { api } from './client';
import type {
  EquipmentResponseDTO,
  CreateEquipmentDTO,
  EquipmentFilterDTO,
  MoveEquipmentDTO,
  SwapEquipmentDTO,
  DashboardStatsDTO,
  SectorMetricDTO,
  PagedResponse,
  EquipmentType,
  EquipmentStatus,
} from '../types';

export const equipmentApi = {
  list: (page = 0, size = 20, sortBy = 'createdAt', sortDirection = 'DESC') =>
    api.get<PagedResponse<EquipmentResponseDTO>>('/equipments', {
      params: { page, size, sortBy, sortDirection },
    }).then(r => r.data),

  filter: (filters: EquipmentFilterDTO) =>
    api.post<EquipmentResponseDTO[]>('/equipments/filter', filters).then(r => r.data),

  create: (data: CreateEquipmentDTO) =>
    api.post<EquipmentResponseDTO>('/equipments', data).then(r => r.data),

  update: (id: string, data: CreateEquipmentDTO) =>
    api.put<EquipmentResponseDTO>(`/equipments/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/equipments/${id}`).then(r => r.data),

  move: (data: MoveEquipmentDTO) =>
    api.post('/equipments/move', data).then(r => r.data),

  swap: (data: SwapEquipmentDTO) =>
    api.post('/equipments/swap', data).then(r => r.data),

  getTypes: () =>
    api.get<EquipmentType[]>('/equipments/types').then(r => r.data),

  getStatuses: () =>
    api.get<EquipmentStatus[]>('/equipments/statuses').then(r => r.data),

  getKpis: () =>
    api.get<DashboardStatsDTO>('/equipments/stats/kpi').then(r => r.data),

  getSectorStats: () =>
    api.get<SectorMetricDTO[]>('/equipments/stats/sectors').then(r => r.data),
};
