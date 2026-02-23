import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Terminal,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Server,
  Code2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Users,
  Wrench,
} from "lucide-react";
import { devApi } from "../api/dev.api";
import { ConfirmDialog } from "./confirm-dialog";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "1.0.0";
const API_URL     = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081/api";

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-[12px] text-gray-400" style={{ fontWeight: 500 }}>{label}</span>
      <span className={`text-[12px] text-gray-700 ${mono ? "font-mono bg-gray-50 px-2 py-0.5 rounded" : ""}`} style={{ fontWeight: mono ? 400 : 600 }}>
        {value}
      </span>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-rose-500" : "bg-emerald-500"}`} />
    </span>
  );
}

export function DevPage() {
  usePageTitle("Dev Panel");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<"enable" | "disable" | null>(null);

  // Polling de status a cada 10s
  const { data: maintenanceStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: devApi.getMaintenanceStatus,
    refetchInterval: 10_000,
    retry: 1,
  });

  const isMaintenanceActive = maintenanceStatus?.active ?? false;

  const enableMutation = useMutation({
    mutationFn: devApi.enableMaintenance,
    onSuccess: () => {
      toast.success("Modo manutenção ativado. Usuários serão redirecionados.");
      queryClient.invalidateQueries({ queryKey: ["maintenance-status"] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error("Erro ao ativar manutenção.");
      setConfirmAction(null);
    },
  });

  const disableMutation = useMutation({
    mutationFn: devApi.disableMaintenance,
    onSuccess: () => {
      toast.success("Sistema retomado. Manutenção desativada.");
      queryClient.invalidateQueries({ queryKey: ["maintenance-status"] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error("Erro ao desativar manutenção.");
      setConfirmAction(null);
    },
  });

  const handleConfirm = () => {
    if (confirmAction === "enable") enableMutation.mutate();
    else if (confirmAction === "disable") disableMutation.mutate();
  };

  const isMutating = enableMutation.isPending || disableMutation.isPending;

  return (
    <div className="p-4 md:p-6 lg:p-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Terminal className="w-5 h-5 text-violet-700" />
        </div>
        <div>
          <h3 className="text-[18px] text-foreground" style={{ fontWeight: 700 }}>
            Painel do Desenvolvedor
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Controle de sistema, manutenção e configurações avançadas
          </p>
        </div>

        {/* Badge de acesso restrito */}
        <div className="ml-auto shrink-0 flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] px-2.5 py-1.5 rounded-lg" style={{ fontWeight: 600 }}>
          <Code2 className="w-3.5 h-3.5" />
          Acesso DEV
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Card: Modo Manutenção ── */}
        <div className="lg:col-span-2">
          <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isMaintenanceActive ? "border-rose-200" : "border-gray-200"}`}>
            <div className={`px-5 py-4 border-b flex items-center gap-3 ${isMaintenanceActive ? "border-rose-100 bg-rose-50/40" : "border-gray-100 bg-gray-50/50"}`}>
              <Wrench className={`w-4 h-4 ${isMaintenanceActive ? "text-rose-600" : "text-gray-500"}`} />
              <h4 className="text-[14px] text-foreground" style={{ fontWeight: 700 }}>
                Controle de Manutenção
              </h4>
              {loadingStatus ? (
                <div className="ml-auto w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <StatusDot active={isMaintenanceActive} />
                  <span
                    className={`text-[12px] ${isMaintenanceActive ? "text-rose-600" : "text-emerald-600"}`}
                    style={{ fontWeight: 600 }}
                  >
                    {isMaintenanceActive ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
              )}
            </div>

            <div className="p-5">
              {isMaintenanceActive ? (
                <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl mb-5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] text-rose-800" style={{ fontWeight: 600 }}>
                      Sistema em manutenção
                    </p>
                    <p className="text-[12px] text-rose-600 mt-0.5 leading-relaxed">
                      Todos os usuários estão sendo redirecionados para a tela de manutenção.
                      Apenas este painel e o endpoint <code className="font-mono bg-rose-100 px-1 rounded">GET /setup</code> estão acessíveis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl mb-5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] text-emerald-800" style={{ fontWeight: 600 }}>
                      Sistema operacional
                    </p>
                    <p className="text-[12px] text-emerald-600 mt-0.5 leading-relaxed">
                      Todos os serviços estão funcionando normalmente. O frontend faz polling a cada 30s quando em manutenção.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {isMaintenanceActive ? (
                  <button
                    onClick={() => setConfirmAction("disable")}
                    disabled={isMutating}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[13px] shadow-sm transition-all disabled:opacity-50"
                    style={{ fontWeight: 600 }}
                  >
                    <Power className="w-4 h-4" />
                    Restaurar Sistema
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction("enable")}
                    disabled={isMutating}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-[13px] shadow-sm transition-all disabled:opacity-50"
                    style={{ fontWeight: 600 }}
                  >
                    <PowerOff className="w-4 h-4" />
                    Ativar Manutenção
                  </button>
                )}
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["maintenance-status"] })}
                  disabled={loadingStatus}
                  className="flex items-center gap-2 border border-gray-200 text-gray-500 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-[13px] transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
                  Atualizar status
                </button>
              </div>

              <p className="mt-3 text-[11px] text-gray-400">
                Status atualizado automaticamente a cada 10 segundos.
              </p>
            </div>
          </div>

          {/* ── Card: Acesso Rápido ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-5">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-[14px] text-foreground flex items-center gap-2" style={{ fontWeight: 700 }}>
                <ExternalLink className="w-4 h-4 text-gray-500" />
                Acesso Rápido
              </h4>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  label: "Log de Auditoria",
                  description: "Histórico completo de ações do sistema",
                  icon: ShieldCheck,
                  color: "text-sky-600 bg-sky-50",
                  action: () => navigate("/auditoria"),
                },
                {
                  label: "Gestão de Usuários",
                  description: "Criar, editar e gerenciar usuários",
                  icon: Users,
                  color: "text-violet-600 bg-violet-50",
                  action: () => navigate("/usuarios"),
                },
                {
                  label: "Dashboard",
                  description: "Visão geral dos equipamentos",
                  icon: Cpu,
                  color: "text-emerald-600 bg-emerald-50",
                  action: () => navigate("/"),
                },
                {
                  label: "API Backend",
                  description: API_URL,
                  icon: Server,
                  color: "text-amber-600 bg-amber-50",
                  action: () => window.open(API_URL.replace("/api", "/swagger-ui.html"), "_blank"),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] text-gray-700" style={{ fontWeight: 600 }}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{item.description}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 ml-auto flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Coluna direita: Info do sistema ── */}
        <div className="space-y-5">
          {/* Frontend info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-[14px] text-foreground flex items-center gap-2" style={{ fontWeight: 700 }}>
                <Code2 className="w-4 h-4 text-gray-500" />
                Frontend
              </h4>
            </div>
            <div className="px-5 py-2">
              <InfoRow label="Versão"         value={`v${APP_VERSION}`} mono />
              <InfoRow label="Ambiente"        value={import.meta.env.MODE} mono />
              <InfoRow label="API Base URL"    value={API_URL} mono />
              <InfoRow
                label="Build"
                value={import.meta.env.PROD ? "Produção" : "Desenvolvimento"}
              />
            </div>
          </div>

          {/* Backend info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h4 className="text-[14px] text-foreground flex items-center gap-2" style={{ fontWeight: 700 }}>
                <Database className="w-4 h-4 text-gray-500" />
                Backend
              </h4>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded" style={{ fontWeight: 600 }}>
                via /dev/system/info
              </span>
            </div>
            <div className="px-5 py-2">
              <InfoRow label="Status API"   value={
                <span className="flex items-center gap-1.5 text-emerald-600" style={{ fontWeight: 600 }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Online
                </span>
              } />
              <InfoRow label="Manutenção" value={
                isMaintenanceActive
                  ? <span className="text-rose-600" style={{ fontWeight: 600 }}>Ativa</span>
                  : <span className="text-emerald-600" style={{ fontWeight: 600 }}>Inativa</span>
              } />
            </div>
          </div>

          {/* Atalhos de teclado */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <p className="text-[12px] text-violet-700 flex items-center gap-1.5 mb-3" style={{ fontWeight: 700 }}>
              <Clock className="w-3.5 h-3.5" />
              Comportamentos automáticos
            </p>
            <ul className="space-y-2 text-[12px] text-violet-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                Status de manutenção atualizado a cada <strong>10s</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                Tela de manutenção faz polling no backend a cada <strong>30s</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                Sessão expira após <strong>15min</strong> de inatividade
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                Aviso de expiração aparece com <strong>2min</strong> de antecedência
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmação de ativar manutenção */}
      <ConfirmDialog
        open={confirmAction === "enable"}
        variant="warning"
        title="Ativar Modo Manutenção"
        message="Todos os usuários serão imediatamente redirecionados para a tela de manutenção e não conseguirão usar o sistema. Apenas você (DEV) continuará com acesso."
        requirePhrase="MANUTENCAO"
        confirmLabel="Ativar manutenção"
        cancelLabel="Cancelar"
        loading={enableMutation.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Confirmação de desativar manutenção */}
      <ConfirmDialog
        open={confirmAction === "disable"}
        variant="warning"
        title="Restaurar Sistema"
        message="O sistema voltará a operar normalmente. Usuários que estiverem na tela de manutenção serão redirecionados automaticamente para o login em até 30 segundos."
        confirmLabel="Restaurar sistema"
        cancelLabel="Cancelar"
        loading={disableMutation.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
