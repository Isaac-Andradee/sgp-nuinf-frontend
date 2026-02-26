import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Monitor,
  Filter,
  X,
} from "lucide-react";
import { auditApi } from "../api/audit.api";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_COLORS,
} from "../types";
import type { AuditActionType } from "../types";
import { usePageTitle } from "../hooks/usePageTitle";

const ACTION_TYPE_OPTIONS: { value: AuditActionType | ""; label: string }[] = [
  { value: "",                   label: "Todos os eventos"          },
  { value: "LOGIN",              label: "Login"                     },
  { value: "LOGOUT",             label: "Logout"                    },
  { value: "EQUIPMENT_CREATE",   label: "Cadastro de Equipamento"   },
  { value: "EQUIPMENT_UPDATE",   label: "Atualização de Equipamento"},
  { value: "EQUIPMENT_DELETE",   label: "Exclusão de Equipamento"   },
  { value: "EQUIPMENT_SWAP",     label: "Substituição de Equipamento"},
  { value: "EQUIPMENT_TRANSFER", label: "Transferência de Equipamento"},
  { value: "USER_CREATE",        label: "Criação de Usuário"        },
  { value: "USER_UPDATE",        label: "Atualização de Usuário"    },
  { value: "USER_DELETE",        label: "Exclusão de Usuário"       },
];
const ACTION_TYPE_OPTIONS_SORTED = [...ACTION_TYPE_OPTIONS].sort((a, b) =>
  a.label === "Todos os eventos" ? -1 : b.label === "Todos os eventos" ? 1 : a.label.localeCompare(b.label)
);

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getRelativeLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  if (diffSec < 60)       return "agora mesmo";
  if (diffMin < 60)       return `há ${diffMin}min`;
  if (diffMin < 1440)     return `há ${Math.floor(diffMin / 60)}h`;
  return `há ${Math.floor(diffMin / 1440)}d`;
}

function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => getRelativeLabel(iso));

  useEffect(() => {
    const tick = () => setLabel(getRelativeLabel(iso));
    // Atualiza a cada 30s para manter o tempo relativo preciso
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <span title={formatDate(iso)} className="text-gray-400 text-[11px]">
      {label}
    </span>
  );
}

export function AuditoriaPage() {
  usePageTitle("Auditoria");
  const [page, setPage] = useState(0);
  const [actorSearch, setActorSearch] = useState("");
  const [actionType, setActionType] = useState<AuditActionType | "">("");

  const hasFilters = !!(actorSearch || actionType);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit", page, actorSearch, actionType],
    queryFn: () =>
      auditApi.list({
        page,
        size: 20,
        actorUsername: actorSearch || undefined,
        actionType:    actionType   || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const clearFilters = () => {
    setActorSearch("");
    setActionType("");
    setPage(0);
  };

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  return (
    <div className="p-4 md:p-6 lg:p-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-[18px] text-foreground" style={{ fontWeight: 700 }}>
              Log de Auditoria
            </h3>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Histórico completo de ações realizadas no sistema
          </p>
        </div>
        {totalElements > 0 && (
          <div className="shrink-0 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 text-center">
            <p className="text-[20px] text-primary tabular-nums" style={{ fontWeight: 700 }}>
              {totalElements.toLocaleString("pt-BR")}
            </p>
            <p className="text-[10px] text-primary/60 uppercase tracking-wide" style={{ fontWeight: 600 }}>
              eventos totais
            </p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Busca por usuário */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-1" style={{ fontWeight: 600 }}>
                Filtrar por Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={actorSearch}
                  onChange={(e) => { setActorSearch(e.target.value); setPage(0); }}
                  type="text"
                  placeholder="Username do autor da ação..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all bg-white"
                />
              </div>
            </div>

            {/* Tipo de ação */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-1" style={{ fontWeight: 600 }}>
                Tipo de Evento
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={actionType}
                  onChange={(e) => { setActionType(e.target.value as AuditActionType | ""); setPage(0); }}
                  className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all bg-white appearance-none"
                >
                  {ACTION_TYPE_OPTIONS_SORTED.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 flex items-center gap-1.5 text-[12px] text-sky-600 hover:text-sky-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Data/Hora", "Usuário", "Evento", "Descrição", "IP"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 md:px-5 py-3 text-left text-[11px] text-gray-400 bg-gray-50/60 whitespace-nowrap ${
                      i === 3 ? "w-full" : ""
                    }`}
                    style={{ fontWeight: 700 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-gray-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-[13px] text-rose-500">
                      Erro ao carregar o log de auditoria. Verifique sua conexão.
                    </p>
                  </td>
                </tr>
              ) : data?.content.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Search className="w-5 h-5 text-gray-300" />
                      </div>
                      <p className="text-[14px] text-gray-400" style={{ fontWeight: 500 }}>
                        {hasFilters ? "Nenhum evento encontrado com esses filtros" : "Nenhum evento registrado ainda"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.content.map((log) => {
                  const colors = AUDIT_ACTION_COLORS[log.actionType];
                  return (
                    <tr key={log.id} className="hover:bg-sky-50/20 transition-colors duration-100">
                      {/* Data */}
                      <td className="px-4 md:px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            <span className="text-[12px] text-gray-600" style={{ fontWeight: 500 }}>
                              {new Date(log.createdAt).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <RelativeTime iso={log.createdAt} />
                        </div>
                      </td>

                      {/* Usuário */}
                      <td className="px-4 md:px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-sky-600" />
                          </div>
                          <span className="text-[13px] text-gray-700" style={{ fontWeight: 500 }}>
                            {log.actorUsername || <span className="text-gray-300 italic">anônimo</span>}
                          </span>
                        </div>
                      </td>

                      {/* Tipo de evento */}
                      <td className="px-4 md:px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${colors.bg} ${colors.text}`}
                          style={{ fontWeight: 600 }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {AUDIT_ACTION_LABELS[log.actionType]}
                        </span>
                      </td>

                      {/* Descrição */}
                      <td className="px-4 md:px-5 py-3.5">
                        <p className="text-[13px] text-gray-600 max-w-[360px] truncate" title={log.description}>
                          {log.description || <span className="text-gray-300">—</span>}
                        </p>
                        {log.entityId && (
                          <p className="text-[10px] text-gray-300 font-mono mt-0.5">
                            {log.entityType} · {log.entityId.slice(0, 8)}…
                          </p>
                        )}
                      </td>

                      {/* IP */}
                      <td className="px-4 md:px-5 py-3.5 whitespace-nowrap">
                        {log.ipAddress ? (
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            <span className="text-[12px] text-gray-500 font-mono">{log.ipAddress}</span>
                          </div>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between gap-4">
            <p className="text-[12px] text-gray-400">
              Página <span style={{ fontWeight: 600 }} className="text-gray-600">{page + 1}</span> de{" "}
              <span style={{ fontWeight: 600 }} className="text-gray-600">{totalPages}</span>
              {" "}·{" "}
              <span style={{ fontWeight: 600 }} className="text-gray-600">
                {totalElements.toLocaleString("pt-BR")}
              </span>{" "}
              eventos
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                const isActive = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded-lg text-[13px] transition-colors ${
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "border border-gray-200 text-gray-500 hover:bg-gray-100"
                    }`}
                    style={{ fontWeight: isActive ? 700 : 400 }}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-300 text-center mt-2">
        Dados atualizados a cada vez que a página é carregada · Acesso restrito a administradores
      </p>
    </div>
  );
}
