import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router";
import { Network, User, Lock, Mail, ArrowRight } from "lucide-react";
import axios from "axios";
import { api } from "../api/client";
import { authApi } from "../api/auth.api";
import { useAuth } from "../contexts/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { ThemeSwitcher } from "./theme-switcher";
import { toast } from "sonner";

const PASSWORD_REGEX = /^(?=.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).*$/;

export function SetupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, refetchUser } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", passwordConfirm: "", email: "", fullName: "" });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState("");
  usePageTitle("Configuração Inicial");

  // Verifica se o setup ainda é necessário ao montar a página
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) return; // já autenticado → guard irá redirecionar

    const check = async () => {
      let skipSetChecking = false;
      try {
        try {
          await api.get("/auth/me", { validateStatus: (s) => s < 500 });
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 503) {
            skipSetChecking = true;
            if (window.location.pathname !== '/maintenance') {
              window.location.replace('/maintenance');
            }
            return;
          }
          navigate("/login", { replace: true });
          return;
        }
        const baseURL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081/api")
          .replace(/\/api\/?$/, "");
        const response = await axios.get<{ needsSetup: boolean }>(
          `${baseURL}/setup`,
          { validateStatus: () => true, withCredentials: true, timeout: 5000 }
        );
        if (response.status === 200 && response.data?.needsSetup === false) {
          navigate("/login", { replace: true });
        } else if (response.status === 200 && response.data?.needsSetup === true) {
          setNeedsSetup(true);
        } else {
          navigate("/login", { replace: true });
        }
      } catch {
        navigate("/login", { replace: true });
      } finally {
        if (!skipSetChecking) setChecking(false);
      }
    };

    check();
  }, [authLoading, isAuthenticated, navigate]);

  // Usuário já autenticado → vai para o dashboard
  if (!authLoading && isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!PASSWORD_REGEX.test(form.password)) {
      setError("Senha deve ter mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("As senhas não coincidem. Confira e tente novamente.");
      return;
    }

    setLoading(true);
    try {
      await authApi.setup(form);
      toast.success("Administrador criado com sucesso! Faça login.");
      await refetchUser();
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axErr?.response?.status === 404) {
        setError("O sistema já foi configurado. Faça login normalmente.");
        navigate("/login", { replace: true });
      } else {
        setError(axErr?.response?.data?.message ?? "Erro ao criar administrador.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-sky-800 to-sky-700 dark:from-background dark:via-background dark:to-background">
        <div className="absolute top-4 right-4 z-10">
          <ThemeSwitcher />
        </div>
        <div className="w-8 h-8 border-2 border-white/30 dark:border-primary/30 border-t-white dark:border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!needsSetup) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-900 via-sky-800 to-sky-700 dark:from-background dark:via-background dark:to-background"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 dark:opacity-5" style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10 dark:opacity-5" style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }} />
      </div>

      <div className="w-full max-w-[440px] relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 dark:bg-card backdrop-blur-sm mb-4 border border-white/20 dark:border-border">
            <Network className="w-8 h-8 text-sky-300 dark:text-primary" />
          </div>
          <h1 className="text-white dark:text-foreground text-[28px] tracking-tight" style={{ fontWeight: 700 }}>
            SGP <span className="text-sky-300 dark:text-primary">NUINF</span>
          </h1>
          <p className="text-sky-200/60 dark:text-muted-foreground text-[13px] mt-1">Configuracao Inicial do Sistema</p>
        </div>

        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
          <div className="p-8">
            <h3 className="text-[18px] text-foreground mb-1 text-center" style={{ fontWeight: 600 }}>
              Criar Administrador
            </h3>
            <p className="text-[13px] text-muted-foreground mb-6 text-center">
              Configure o primeiro acesso ao sistema
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-700 dark:text-red-300">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-[14px]"
                    placeholder="Administrador NUINF" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-[14px]"
                    placeholder="admin" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-[14px]"
                    placeholder="admin@nuinf.mil.br" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-[14px]"
                    placeholder="Mín. 8 chars, maiúscula, número e especial" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial.
                </p>
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="password" value={form.passwordConfirm} onChange={(e) => setForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-[14px]"
                    placeholder="Repita a senha" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:opacity-90 text-primary-foreground py-3 rounded-xl shadow-lg shadow-sky-600/20 dark:shadow-none transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 text-[14px]"
                style={{ fontWeight: 600 }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Criar Administrador <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
