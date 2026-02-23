import { api } from "./client";

export interface MaintenanceStatus {
  active: boolean;
}

export interface SystemInfo {
  javaVersion?: string;
  springVersion?: string;
  dbStatus?: string;
  uptime?: string;
  activeUsers?: number;
}

export const devApi = {
  /** Obtém o status atual do modo manutenção */
  getMaintenanceStatus: (): Promise<MaintenanceStatus> =>
    api.get<MaintenanceStatus>("/dev/maintenance/status").then((r) => r.data),

  /** Ativa o modo manutenção */
  enableMaintenance: (): Promise<{ message: string }> =>
    api.post<{ message: string }>("/dev/maintenance/enable").then((r) => r.data),

  /** Desativa o modo manutenção */
  disableMaintenance: (): Promise<{ message: string }> =>
    api.post<{ message: string }>("/dev/maintenance/disable").then((r) => r.data),

  /** Informações do sistema (opcional — se o backend expuser) */
  getSystemInfo: (): Promise<SystemInfo> =>
    api.get<SystemInfo>("/dev/system/info").then((r) => r.data),
};
