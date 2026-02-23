// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'USER' | 'VIEWER' | 'DEV';

export type EquipmentType =
  | 'DESKTOP'
  | 'MONITOR'
  | 'TECLADO'
  | 'MOUSE'
  | 'LAPTOP'
  | 'IMPRESSORA'
  | 'ROTEADOR'
  | 'SWITCH'
  | 'SERVIDOR';

export type EquipmentStatus =
  | 'DISPONIVEL'
  | 'INDISPONIVEL'
  | 'PROVISORIO'
  | 'EM_USO'
  | 'MANUTENCAO'
  | 'BAIXADO';

// ─── Labels e Cores ──────────────────────────────────────────────────────────

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  DESKTOP: 'Desktop',
  MONITOR: 'Monitor',
  TECLADO: 'Teclado',
  MOUSE: 'Mouse',
  LAPTOP: 'Laptop',
  IMPRESSORA: 'Impressora',
  ROTEADOR: 'Roteador',
  SWITCH: 'Switch',
  SERVIDOR: 'Servidor',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  DISPONIVEL: 'Disponível',
  INDISPONIVEL: 'Indisponível',
  PROVISORIO: 'Provisório',
  EM_USO: 'Em Uso',
  MANUTENCAO: 'Manutenção',
  BAIXADO: 'Baixado',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, { bg: string; text: string; border: string }> = {
  DISPONIVEL:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  EM_USO:       { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200'     },
  PROVISORIO:   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  INDISPONIVEL: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
  MANUTENCAO:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  BAIXADO:      { bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200'    },
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:  'Administrador',
  USER:   'Usuário',
  VIEWER: 'Visualizador',
  DEV:    'Desenvolvedor',
};

export const USER_ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  ADMIN:  { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200'    },
  USER:   { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200'   },
  VIEWER: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  DEV:    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

export function shouldShowUserField(status: EquipmentStatus): boolean {
  return status === 'EM_USO' || status === 'PROVISORIO';
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  expiresIn: number;
  username: string;
  fullName: string;
  role: UserRole;
}

export interface SetupRequest {
  username: string;
  password: string;
  email: string;
  fullName?: string;
}

// ─── Usuários ────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  enabled?: boolean;
  lastLoginAt?: string; // ISO 8601 — retornado pelo GET /auth/me como "lastLoginAt"
}

// ─── Auditoria ───────────────────────────────────────────────────────────────

export type AuditActionType =
  | 'EQUIPMENT_CREATE'
  | 'EQUIPMENT_UPDATE'
  | 'EQUIPMENT_DELETE'
  | 'EQUIPMENT_SWAP'
  | 'EQUIPMENT_TRANSFER'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'LOGIN'
  | 'LOGOUT';

export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  EQUIPMENT_CREATE:   'Cadastro de Equipamento',
  EQUIPMENT_UPDATE:   'Atualização de Equipamento',
  EQUIPMENT_DELETE:   'Exclusão de Equipamento',
  EQUIPMENT_SWAP:     'Substituição de Equipamento',
  EQUIPMENT_TRANSFER: 'Transferência de Equipamento',
  USER_CREATE:        'Criação de Usuário',
  USER_UPDATE:        'Atualização de Usuário',
  USER_DELETE:        'Exclusão de Usuário',
  LOGIN:              'Login',
  LOGOUT:             'Logout',
};

export const AUDIT_ACTION_COLORS: Record<AuditActionType, { bg: string; text: string; dot: string }> = {
  EQUIPMENT_CREATE:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  EQUIPMENT_UPDATE:   { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  EQUIPMENT_DELETE:   { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  EQUIPMENT_SWAP:     { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  EQUIPMENT_TRANSFER: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  USER_CREATE:        { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-500'    },
  USER_UPDATE:        { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
  USER_DELETE:        { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  LOGIN:              { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
  LOGOUT:             { bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-300'    },
};

export interface AuditLog {
  id: string;
  actorUsername: string;
  actionType: AuditActionType;
  entityType: string;
  entityId: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  password?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  enabled?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ─── Setores ─────────────────────────────────────────────────────────────────

export interface SectorResponseDTO {
  id: string;
  acronym: string;
  fullName: string;
}

export interface CreateSectorDTO {
  fullName: string;
  acronym: string;
}

// ─── Equipamentos ─────────────────────────────────────────────────────────────

export interface EquipmentResponseDTO {
  id: string;
  assetNumber: string;
  serialNumber?: string;
  description?: string;
  hostname?: string;
  ipAddress?: string;
  brand: string;
  type: EquipmentType;
  status: EquipmentStatus;
  equipmentUser?: string;
  currentSector: SectorResponseDTO;
  createdAt: string;
}

export interface CreateEquipmentDTO {
  assetNumber: string;
  serialNumber?: string;
  description?: string;
  hostname?: string;
  ipAddress?: string;
  brand: string;
  type: EquipmentType;
  status: EquipmentStatus;
  equipmentUser?: string;
  sectorId: string;
}

export interface EquipmentFilterDTO {
  textoBusca?: string;
  marca?: string;
  setorId?: string;
  tipo?: EquipmentType;
  status?: EquipmentStatus;
}

export interface MoveEquipmentDTO {
  equipmentId: string;
  targetSectorId: string;
  targetUser?: string;
  targetStatus: EquipmentStatus;
}

export interface SwapEquipmentDTO {
  outgoingEquipmentId: string;
  incomingEquipmentId: string;
  isDefective: boolean;
  /** Descrição do defeito — será anexada à descrição existente do equipamento */
  defectDescription?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStatsDTO {
  totalDisponivel: number;
  totalIndisponivel: number;
  totalAtivos: number;
  totalManutencao: number;
  totalProvisorio: number;
  totalGeral: number;
}

export interface SectorMetricDTO {
  acronym: string;
  fullName: string;
  totalItens: number;
  distributionByType: Partial<Record<EquipmentType, number>>;
}

// ─── Paginação ───────────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>;
}
