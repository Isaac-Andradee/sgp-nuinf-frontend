import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { Network, Settings, RefreshCw, Clock } from "lucide-react";
import axios from "axios";
import { usePageTitle } from "../hooks/usePageTitle";

const POLL_INTERVAL_MS = 30_000;

function getApiBaseURL() {
  return import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081/api";
}

/**
 * Verifica se a manutenção acabou.
 * Usa um endpoint que retorna 503 em manutenção (GET /api/auth/me).
 * Não usa GET /setup — ele é liberado durante manutenção e retorna 200, o que fazia a tela ir para /login.
 */
async function checkIfSystemIsBack(): Promise<boolean> {
  try {
    const response = await axios.get(`${getApiBaseURL()}/auth/me`, {
      validateStatus: () => true,
      timeout: 8000,
      withCredentials: true,
    });
    return response.status !== 503;
  } catch {
    return false;
  }
}

function useCountdown(targetDate: Date | null) {
  const [remaining, setRemaining] = useState<{
    days: number; hours: number; minutes: number; seconds: number; expired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setRemaining({ days, hours, minutes, seconds, expired: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return remaining;
}

export function MaintenancePage() {
  usePageTitle("Sistema em Manutenção");
  const navigate = useNavigate();

  const maintenanceDateStr = import.meta.env.VITE_MAINTENANCE_DATE ?? "";
  const targetDate = useMemo(
    () => (maintenanceDateStr ? new Date(maintenanceDateStr) : null),
    [maintenanceDateStr]
  );
  const countdown = useCountdown(targetDate);

  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [dotAngle, setDotAngle] = useState(0);

  // Animação do ícone de engrenagem
  useEffect(() => {
    const id = setInterval(() => setDotAngle((a) => (a + 1) % 360), 16);
    return () => clearInterval(id);
  }, []);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const poll = useCallback(async () => {
    setChecking(true);
    try {
      const back = await checkIfSystemIsBack();
      setLastCheck(new Date());
      if (back) {
        navigateRef.current("/login", { replace: true });
      }
    } finally {
      setChecking(false);
    }
  }, []);

  // Poll automático a cada 30s (sem dep de poll para evitar re-execução em loop)
  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg, #0c4a6e 0%, #075985 35%, #0369a1 70%, #0284c7 100%)",
      }}
    >
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }} />
      </div>

      <div className="w-full max-w-lg relative text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Network className="w-5 h-5 text-sky-300" />
          </div>
          <div className="text-left">
            <span className="text-white text-[22px] tracking-tight" style={{ fontWeight: 700 }}>
              SGP <span className="text-sky-300">NUINF</span>
            </span>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 shadow-2xl">
          {/* Ícone animado */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center">
                <Settings
                  className="w-9 h-9 text-amber-300"
                  style={{ transform: `rotate(${dotAngle}deg)`, transition: "transform 16ms linear" }}
                />
              </div>
            </div>
          </div>

          <h1 className="text-[26px] text-white mb-2" style={{ fontWeight: 700 }}>
            Sistema em Manutenção
          </h1>
          <p className="text-sky-200/80 text-[14px] mb-8 leading-relaxed">
            Estamos realizando melhorias para servir melhor a nossa unidade.
            <br />O sistema voltará em breve.
          </p>

          {/* Countdown — só aparece se VITE_MAINTENANCE_DATE está definida */}
          {countdown && !countdown.expired && (
            <div className="mb-8">
              <p className="text-[11px] text-sky-300/70 uppercase tracking-widest mb-3" style={{ fontWeight: 700 }}>
                Previsão de retorno
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: countdown.days, label: "Dias" },
                  { value: countdown.hours, label: "Horas" },
                  { value: countdown.minutes, label: "Min" },
                  { value: countdown.seconds, label: "Seg" },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-white/10 rounded-xl py-3">
                    <p className="text-[26px] text-white tabular-nums" style={{ fontWeight: 700 }}>
                      {String(value).padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-sky-300/60 uppercase tracking-wide" style={{ fontWeight: 600 }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {countdown?.expired && (
            <div className="mb-6 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl">
              <p className="text-emerald-300 text-[13px]" style={{ fontWeight: 500 }}>
                O tempo previsto passou. Verificando se o sistema voltou...
              </p>
            </div>
          )}

          {/* Botão de verificação manual */}
          <button
            onClick={poll}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white py-3 rounded-xl transition-all duration-200 text-[14px] disabled:opacity-60"
            style={{ fontWeight: 600 }}
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Verificando..." : "Verificar novamente"}
          </button>

          {/* Última verificação */}
          {lastCheck && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-sky-300/50">
              <Clock className="w-3.5 h-3.5" />
              <span>Última verificação: {formatTime(lastCheck)}</span>
              <span className="text-sky-300/30">·</span>
              <span>Automático a cada 30s</span>
            </div>
          )}
        </div>

        {/* Rodapé da tela de manutenção */}
        <p className="mt-8 text-[12px] text-sky-300/40">
          SGP NUINF — Sistema de Gestão Patrimonial · Núcleo de Informática
        </p>
      </div>
    </div>
  );
}
