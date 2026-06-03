import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api';

export function LoginPage() {
  const [email, setEmail] = useState('admin@dentaflow.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      setAuth(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-600/30">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                <path d="M12 2C9 2 7 4 7 6c0 1.5.5 2.5.5 4C7.5 12 6 13.5 6 16c0 2.5 1.5 4 3 4 .8 0 1.5-.5 2-.5s1.2.5 2 .5c1.5 0 3-1.5 3-4 0-2.5-1.5-4-1.5-6 0-1.5.5-2.5.5-4 0-2-2-4-5-4z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-medium text-white">DentaFlow</h1>
            <p className="text-slate-400 text-base mt-1">Sistema de gestión odontológica</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/10 text-white placeholder:text-slate-500
                           px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50
                           transition-colors"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="label text-slate-300">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/10 text-white placeholder:text-slate-500
                           px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50
                           transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2 shadow-lg shadow-teal-600/20"
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            DentaFlow v1.0 — Uso exclusivo del personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
