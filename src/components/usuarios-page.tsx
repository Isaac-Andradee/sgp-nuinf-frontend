import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Users, Shield, Mail, User, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/user.api";
import type { UserResponse, UserRole, CreateUserRequest, UpdateUserRequest } from "../types";
import { USER_ROLE_LABELS } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

/** Hierarquia: DEV > ADMIN > USER > VIEWER. Apenas roles acima podem editar/excluir. ADMIN não edita/exclui DEV. */
function canEditUser(actorRole: UserRole | undefined, targetUser: UserResponse): boolean {
  if (!actorRole) return false;
  if (actorRole === "DEV") return true;
  if (actorRole === "ADMIN") return targetUser.role !== "DEV";
  return false; // USER e VIEWER não têm acesso à página de usuários (rota AdminOnly)
}

const PASSWORD_REGEX = /^(?=.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).*$/;

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:  "bg-purple-50 text-purple-700 border-purple-200",
  USER:   "bg-sky-50 text-sky-700 border-sky-200",
  VIEWER: "bg-gray-100 text-gray-600 border-gray-200",
  DEV:    "bg-violet-50 text-violet-700 border-violet-200",
};

function UserModal({
  open,
  onClose,
  onSaved,
  user,
  currentUserRole,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user: UserResponse | null;
  currentUserRole: UserRole | undefined;
}) {
  /** ADMIN não pode atribuir role DEV; apenas DEV pode. */
  const assignableRoles: UserRole[] = currentUserRole === "DEV"
    ? (Object.keys(USER_ROLE_LABELS) as UserRole[])
    : (Object.keys(USER_ROLE_LABELS) as UserRole[]).filter((r) => r !== "DEV");
  const [form, setForm] = useState<{
    username: string; password: string; passwordConfirm: string; email: string; fullName: string; role: UserRole; enabled: boolean;
  }>({ username: "", password: "", passwordConfirm: "", email: "", fullName: "", role: "USER", enabled: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setForm({ username: user.username, password: "", passwordConfirm: "", email: user.email, fullName: user.fullName, role: user.role, enabled: user.enabled ?? true });
    } else {
      setForm({ username: "", password: "", passwordConfirm: "", email: "", fullName: "", role: "USER", enabled: true });
    }
    setErrors({});
  }, [user, open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => userApi.create(data),
    onSuccess: () => { toast.success("Usuário criado com sucesso."); onSaved(); },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { message?: string; validationErrors?: Record<string, string> } } };
      if (axErr?.response?.data?.validationErrors) setErrors(axErr.response.data.validationErrors);
      else toast.error(axErr?.response?.data?.message ?? "Erro ao criar usuário.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => userApi.update(id, data),
    onSuccess: () => { toast.success("Usuário atualizado com sucesso."); onSaved(); },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { message?: string; validationErrors?: Record<string, string> } } };
      if (axErr?.response?.data?.validationErrors) setErrors(axErr.response.data.validationErrors);
      else toast.error(axErr?.response?.data?.message ?? "Erro ao atualizar usuário.");
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!user) {
      if (!form.username.trim() || form.username.length < 3) e.username = "Usuário deve ter pelo menos 3 caracteres";
      if (!form.password) e.password = "Senha obrigatória";
      else if (!PASSWORD_REGEX.test(form.password)) e.password = "Senha deve ter maiúscula, minúscula, número e caractere especial (mín. 8 chars)";
      if (form.password !== form.passwordConfirm) e.passwordConfirm = "As senhas não coincidem.";
    } else {
      if (form.password && !PASSWORD_REGEX.test(form.password)) e.password = "Senha deve ter maiúscula, minúscula, número e caractere especial (mín. 8 chars)";
      if (form.password && form.password !== form.passwordConfirm) e.passwordConfirm = "As senhas não coincidem.";
    }
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Email inválido";
    if (!form.fullName.trim()) e.fullName = "Nome obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (user) {
      const payload: UpdateUserRequest = {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        role: form.role,
        enabled: form.enabled,
        ...(form.password ? { password: form.password } : {}),
      };
      updateMutation.mutate({ id: user.id, data: payload });
    } else {
      createMutation.mutate({
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        role: form.role,
      });
    }
  };

  if (!open) return null;

  const field = (key: keyof typeof form) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((prev) => { const n = {...prev}; delete n[key]; return n; });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-[#0c4a6e] px-6 py-4 flex justify-between items-center">
          <h3 className="text-white text-[16px]" style={{ fontWeight: 600 }}>
            {user ? "Editar Usuário" : "Novo Usuário"}
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {!user && (
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                <User className="w-3 h-3 inline mr-1" />Usuário (login)
              </label>
              <input
                value={form.username}
                {...field("username")}
                placeholder="nome.sobrenome"
                className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all ${errors.username ? "border-red-400" : "border-gray-200"}`}
              />
              {errors.username && <p className="text-[11px] text-red-500 mt-1">{errors.username}</p>}
            </div>
          )}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              <User className="w-3 h-3 inline mr-1" />Nome Completo
            </label>
            <input
              value={form.fullName}
              {...field("fullName")}
              placeholder="Nome Completo"
              className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all ${errors.fullName ? "border-red-400" : "border-gray-200"}`}
            />
            {errors.fullName && <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>}
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              <Mail className="w-3 h-3 inline mr-1" />Email
            </label>
            <input
              type="email"
              value={form.email}
              {...field("email")}
              placeholder="email@nuinf.mil.br"
              className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all ${errors.email ? "border-red-400" : "border-gray-200"}`}
            />
            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              <Shield className="w-3 h-3 inline mr-1" />Perfil de Acesso
            </label>
            <select
              value={form.role}
              {...field("role")}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white"
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              {user ? "Nova Senha (deixe vazio para não alterar)" : "Senha"}
            </label>
            <input
              type="password"
              value={form.password}
              {...field("password")}
              placeholder={user ? "Nova senha (opcional)" : "Mín. 8 chars"}
              className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all ${errors.password ? "border-red-400" : "border-gray-200"}`}
            />
            {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              {user ? "Confirmar Nova Senha" : "Confirmar Senha"}
            </label>
            <input
              type="password"
              value={form.passwordConfirm}
              {...field("passwordConfirm")}
              placeholder={user ? "Repita a nova senha (opcional)" : "Repita a senha"}
              className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all ${errors.passwordConfirm ? "border-red-400" : "border-gray-200"}`}
            />
            {errors.passwordConfirm && <p className="text-[11px] text-red-500 mt-1">{errors.passwordConfirm}</p>}
          </div>
          {user && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary"
              />
              <span className="text-[13px] text-gray-600" style={{ fontWeight: 500 }}>Conta ativa</span>
            </label>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-[13px] transition-colors" style={{ fontWeight: 500 }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2.5 bg-primary hover:bg-[#075985] text-white rounded-lg text-[13px] shadow-sm transition-all flex items-center gap-2 disabled:opacity-60" style={{ fontWeight: 600 }}>
            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {user ? "Salvar" : "Criar Usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => userApi.list(page, PAGE_SIZE),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: userApi.remove,
    onSuccess: () => {
      toast.success("Usuário removido com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { message?: string } } };
      toast.error(axErr?.response?.data?.message ?? "Erro ao remover usuário.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      userApi.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Erro ao alterar status do usuário."),
  });

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = (u: UserResponse) => {
    if (!confirm(`Deseja remover o usuário "${u.username}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate(u.id);
  };

  const users = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="p-4 md:p-6 lg:p-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-[18px] text-foreground" style={{ fontWeight: 700 }}>Gestao de Usuarios</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">Gerencie os usuarios do sistema</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setModalOpen(true); }}
          className="bg-primary hover:bg-[#075985] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-lg shadow-sky-600/10 transition-all duration-200 flex items-center gap-2"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Novo Usuario
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {["Nome", "Usuario", "Email", "Perfil", "Status", "Acoes"].map((h, i) => (
                  <th key={h} className={`px-4 md:px-6 py-3.5 text-[10px] text-gray-400 uppercase tracking-wider ${i === 5 ? "text-right" : ""}`} style={{ fontWeight: 700 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 md:px-6 py-3.5"><div className="h-4 bg-gray-100 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-[14px] text-gray-400" style={{ fontWeight: 500 }}>Nenhum usuário encontrado</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="px-4 md:px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-muted-foreground text-[12px]">{u.username}</td>
                    <td className="px-4 md:px-6 py-3.5 text-muted-foreground text-[12px]">{u.email}</td>
                    <td className="px-4 md:px-6 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${ROLE_COLORS[u.role]}`} style={{ fontWeight: 600 }}>
                        {USER_ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3.5">
                      {canEditUser(currentUser?.role, u) ? (
                        <button
                          onClick={() => toggleMutation.mutate({ id: u.id, enabled: !(u.enabled ?? true) })}
                          className="flex items-center gap-1.5 transition-colors"
                          title={u.enabled !== false ? "Desativar" : "Ativar"}
                        >
                          {u.enabled !== false ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-emerald-500" />
                              <span className="text-[12px] text-emerald-600" style={{ fontWeight: 500 }}>Ativo</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                              <span className="text-[12px] text-gray-400" style={{ fontWeight: 500 }}>Inativo</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                          {u.enabled !== false ? "Ativo" : "Inativo"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-right">
                      {canEditUser(currentUser?.role, u) ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingUser(u); setModalOpen(true); }}
                            className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50/50 px-4 md:px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              Total: <span style={{ fontWeight: 600 }}>{data?.totalElements}</span> usuário(s)
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg text-gray-400 hover:text-foreground hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-lg text-[13px] transition-all ${page === i ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100"}`} style={{ fontWeight: page === i ? 600 : 400 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-lg text-gray-400 hover:text-foreground hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <UserModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingUser(null); }}
        onSaved={handleSaved}
        user={editingUser}
        currentUserRole={currentUser?.role}
      />
    </div>
  );
}
