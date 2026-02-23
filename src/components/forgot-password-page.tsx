import { useState } from "react";
import { Link } from "react-router";
import { Network, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { authApi } from "../api/auth.api";
import { usePageTitle } from "../hooks/usePageTitle";

export function ForgotPasswordPage() {
  usePageTitle("Recuperar Senha");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg, #0c4a6e 0%, #075985 30%, #0369a1 70%, #0284c7 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }} />
      </div>

      <div className="w-full max-w-[420px] relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20">
            <Network className="w-8 h-8 text-sky-300" />
          </div>
          <h1 className="text-white text-[28px] tracking-tight" style={{ fontWeight: 700 }}>
            SGP <span className="text-sky-300">NUINF</span>
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-[18px] text-gray-900" style={{ fontWeight: 600 }}>Email enviado</h3>
                <p className="text-[13px] text-gray-500">
                  Se este email estiver cadastrado, você receberá um link para redefinir a senha.
                </p>
                <Link
                  to="/login"
                  className="mt-4 inline-flex items-center gap-2 text-[13px] text-sky-600 hover:text-sky-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </Link>
              </div>
            ) : (
              <>
                <h3 className="text-[18px] text-gray-900 mb-1 text-center" style={{ fontWeight: 600 }}>
                  Esqueceu a senha?
                </h3>
                <p className="text-[13px] text-gray-400 mb-6 text-center">
                  Informe seu email para receber o link de redefinicao.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[12px] text-gray-500 mb-1.5" style={{ fontWeight: 500 }}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-[14px]"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0369a1] hover:bg-[#075985] text-white py-3 rounded-xl shadow-lg shadow-sky-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 text-[14px]"
                    style={{ fontWeight: 600 }}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Enviar link de redefinicao"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="inline-flex items-center gap-1 text-[13px] text-sky-600 hover:text-sky-700 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar ao login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
