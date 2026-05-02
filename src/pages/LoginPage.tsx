import React, { useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const handleSetup = async () => {
    setSetupStatus('loading');
    try {
      const resp = await fetch('/api/seed-system', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao inicializar');
      setSetupStatus('success');
      alert(data.message);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao sincronizar: ' + err.message);
      setSetupStatus('error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Normalize user requirement: username becomes email if it doesn't have @
    let loginEmail = email.includes('@') ? email : `${email.toLowerCase()}@sesipe.com.br`.replace(/\s+/g, '');

    try {
      // Step 0: Check if backend is alive
      try {
        const health = await fetch('/api/health');
        if (!health.ok) throw new Error('Servidor indisponível');
        console.log('Backend health info:', await health.json());
      } catch (e) {
        console.warn('Health check failed, proceeding anyway:', e);
      }

      // USE SERVER LOGIN PROXY
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000); // 15s client-side timeout

      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password }),
        signal: controller.signal
      });
      clearTimeout(id);

      const data = await resp.json();

      if (!resp.ok) {
        let msg = 'Credenciais inválidas. Verifique seu usuário e senha.';
        const code = data.code;
        if (code === 'auth/user-not-found') msg = 'Usuário não cadastrado no sistema.';
        if (code === 'auth/wrong-password') msg = 'Senha incorreta.';
        throw new Error(`${msg} (${code || 'error'})`);
      }

      await signInWithCustomToken(auth, data.customToken);
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro inesperado ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,76,145,0.08)] max-w-sm w-full space-y-8 border border-slate-100"
      >
        <div className="text-center space-y-3">
          <div className="bg-sesi-blue w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sesi-blue/20">
            <span className="text-white font-black text-3xl">S</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Portal SESI PE</h1>
          <p className="text-sm text-slate-400 font-medium">Gestão de Demandas Educacionais</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex flex-col gap-2 border border-red-100"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
              <button 
                type="button"
                onClick={handleSetup}
                className="mt-2 text-blue-700 underline text-left"
              >
                Clique aqui para sincronizar/recuperar usuários caso o erro persista.
              </button>
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Credencial de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  type="text"
                  placeholder="administrador ou nome_escola"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all text-sm font-medium"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha Segura</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all text-sm font-medium"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || setupStatus === 'loading'}
            className="w-full py-4 bg-sesi-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-sesi-blue/20 active:scale-[0.98]"
          >
            {loading ? 'VERIFICANDO...' : setupStatus === 'loading' ? 'SINCRONIZANDO...' : <><LogIn size={18} /> Entrar</>}
          </button>
        </form>

        <div className="text-center pt-4">
          <a href="/" className="text-xs font-bold text-slate-400 hover:text-sesi-blue transition-colors uppercase tracking-tight block">← Retornar ao site público</a>
          {setupStatus === 'success' && (
            <p className="mt-2 text-xs text-green-600 font-bold">✓ Sistema sincronizado!</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
