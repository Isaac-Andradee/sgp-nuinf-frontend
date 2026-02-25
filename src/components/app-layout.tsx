import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Menu,
  X,
  LogOut,
  Network,
  ChevronRight,
  User,
  Users,
  TriangleAlert,
  Clock,
  WifiOff,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useAuth, usePermissions } from "../contexts/AuthContext";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { SessionTimeoutModal } from "./session-timeout-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { toast } from "sonner";
import { USER_ROLE_LABELS } from "../types";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "1.0.0";
const MAINTENANCE_BANNER = import.meta.env.VITE_MAINTENANCE_BANNER ?? "";
const MAINTENANCE_DATE_STR = import.meta.env.VITE_MAINTENANCE_DATE ?? "";

const baseNavItems = [
  { id: "dashboard", label: "Visao Geral",   title: "Visão Geral",    icon: LayoutDashboard, path: "/" },
  { id: "movimentacao", label: "Movimentacao", title: "Movimentação", icon: ArrowLeftRight,  path: "/movimentacao" },
  { id: "setores",  label: "Setores",      title: "Setores",          icon: Building2,       path: "/setores" },
];

const adminNavItems = [
  { id: "usuarios",  label: "Usuarios",  title: "Usuários",  icon: Users,       path: "/usuarios"  },
  { id: "auditoria", label: "Auditoria", title: "Auditoria", icon: ShieldCheck, path: "/auditoria" },
];

function shouldShowBanner(): boolean {
  if (!MAINTENANCE_BANNER) return false;
  if (!MAINTENANCE_DATE_STR) return true;
  const d = new Date(MAINTENANCE_DATE_STR);
  return !isNaN(d.getTime()) && Date.now() < d.getTime();
}

function formatMaintenanceDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("pt-BR", {
      weekday: "short", day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isAdmin, isDev } = usePermissions();
  const isOnline = useOnlineStatus();

  const dismissKey = `sgp_banner_${MAINTENANCE_BANNER}`;
  const [bannerVisible, setBannerVisible] = useState(
    () => shouldShowBanner() && localStorage.getItem(dismissKey) !== "dismissed"
  );

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;
  const devNavItems = isDev ? [
    { id: "dev", label: "Dev Panel", title: "Dev Panel", icon: Terminal, path: "/dev" },
  ] : [];
  const currentNav = navItems.find((item) => item.path === location.pathname) || navItems[0];
  const isPerfilPage = location.pathname === "/perfil";
  const pageLabel = isPerfilPage ? "Meu Perfil" : currentNav.label;
  const pageTitle = isPerfilPage ? "Meu Perfil" : currentNav.title;

  // Título da aba
  useEffect(() => {
    document.title = `${pageTitle} | SGP NUINF`;
  }, [pageTitle]);

  // Esc fecha sidebar no mobile
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  // Toast quando perde/recupera conexão
  useEffect(() => {
    // não notifica no primeiro render
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast.success("Sessão encerrada com sucesso.");
  };

  const handleDismissBanner = () => {
    localStorage.setItem(dismissKey, "dismissed");
    setBannerVisible(false);
  };

  // Session timeout (ativo apenas quando autenticado)
  const { showWarning, secondsLeft, resetTimer } = useSessionTimeout({
    warningAfterMinutes: 13,
    logoutAfterMinutes: 15,
    active: isAuthenticated,
    onLogout: async () => {
      toast.warning("Sessão encerrada por inatividade.");
      await logout();
      navigate("/login");
    },
  });

  return (
    <div className="h-screen flex overflow-hidden bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-[#0c4a6e] text-white flex flex-col z-30 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-400/20 flex items-center justify-center">
              <Network className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <span className="text-[15px] tracking-tight" style={{ fontWeight: 600 }}>SGP</span>
              <span className="text-sky-400 text-[11px] ml-1.5" style={{ fontWeight: 500 }}>NUINF</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-sky-300/50 px-3 mb-2" style={{ fontWeight: 600 }}>
            Menu Principal
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-sky-500/15 text-white border-l-[3px] border-sky-400 pl-[9px]"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90 border-l-[3px] border-transparent pl-[9px]"
                }`}
                style={{ fontWeight: isActive ? 600 : 400 }}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? "text-sky-400" : ""}`} />
                {item.label}
              </button>
            );
          })}

          {/* Seção exclusiva DEV */}
          {devNavItems.length > 0 && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-[10px] uppercase tracking-widest text-violet-300/60 px-3" style={{ fontWeight: 600 }}>
                  Desenvolvedor
                </p>
              </div>
              {devNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-violet-500/15 text-white border-l-[3px] border-violet-400 pl-[9px]"
                        : "text-white/50 hover:bg-white/5 hover:text-white/90 border-l-[3px] border-transparent pl-[9px]"
                    }`}
                    style={{ fontWeight: isActive ? 600 : 400 }}
                  >
                    <Icon className={`w-[18px] h-[18px] ${isActive ? "text-violet-400" : ""}`} />
                    {item.label}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => handleNavigate("/perfil")}
            className="flex items-center gap-3 w-full hover:bg-white/5 rounded-lg p-1 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] text-white truncate" style={{ fontWeight: 500 }}>
                {user?.fullName || user?.username || "Usuário"}
              </p>
              <p className="text-[11px] text-white/40 truncate">
                {user?.role ? USER_ROLE_LABELS[user.role] : ""}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden md:ml-[260px] w-full">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] text-foreground truncate" style={{ fontWeight: 600 }}>
                {pageLabel}
              </h2>
              {/* Breadcrumb clicável */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <button
                  onClick={() => navigate("/")}
                  className="hover:text-primary transition-colors"
                >
                  Inicio
                </button>
                <ChevronRight className="w-3 h-3" />
                <span className="text-primary" style={{ fontWeight: 500 }}>
                  {pageLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="flex items-center gap-2 text-[13px] text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors"
            style={{ fontWeight: 500 }}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </header>

        {/* Banner de conexão offline */}
        {!isOnline && (
          <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-3 shrink-0">
            <WifiOff className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <p className="text-[13px] text-gray-200" style={{ fontWeight: 500 }}>
              Sem conexão com a rede — as ações não serão salvas até você reconectar.
            </p>
          </div>
        )}

        {/* Banner de manutenção programada */}
        {bannerVisible && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
            <TriangleAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-amber-800 truncate" style={{ fontWeight: 500 }}>
                <span style={{ fontWeight: 700 }}>Manutenção Programada:</span>{" "}
                {MAINTENANCE_BANNER}
              </p>
              {MAINTENANCE_DATE_STR && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <p className="text-[11px] text-amber-600">
                    Prevista para {formatMaintenanceDate(MAINTENANCE_DATE_STR)}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleDismissBanner}
              className="text-amber-500 hover:text-amber-700 p-1 rounded transition-colors flex-shrink-0"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-gray-100 bg-white px-4 md:px-6 py-2.5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-1 text-[11px] text-gray-400">
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <span style={{ fontWeight: 600 }} className="text-gray-500">SGP NUINF</span>
              <span className="text-gray-300">·</span>
              <span>Sistema de Gestão Patrimonial</span>
              <span className="text-gray-300">·</span>
              <span>Núcleo de Informática</span>
              <span className="text-gray-300">·</span>
              <span>Uso Interno · Acesso Restrito</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
              <span>© {new Date().getFullYear()} Desenvolvido por</span>
              <span style={{ fontWeight: 600 }} className="text-gray-500">Isaac Andrade</span>
              <span className="text-gray-300">·</span>
              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]" style={{ fontWeight: 600 }}>
                v{APP_VERSION}
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* Modal de expiração de sessão */}
      <SessionTimeoutModal
        open={showWarning}
        secondsLeft={secondsLeft}
        onContinue={resetTimer}
        onLogout={handleLogout}
      />

      {/* Confirmação de logout manual */}
      <ConfirmDialog
        open={logoutConfirmOpen}
        variant="warning"
        title="Sair do sistema?"
        message="Você será desconectado da sua sessão atual. Deseja realmente sair do sistema?"
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          handleLogout();
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}
