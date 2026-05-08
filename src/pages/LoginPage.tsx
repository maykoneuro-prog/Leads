import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Lock, Mail, AlertCircle, User, Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep('Iniciando...');
    setError('');
    
    let loginEmail = email.includes('@') ? email : `${email.toLowerCase()}@sesipe.com.br`.replace(/\s+/g, '');

    try {
      setLoadingStep('Autenticando...');
      await signInWithEmailAndPassword(auth, loginEmail, password);
      
      setLoadingStep('Redirecionando...');
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O provedor de E-mail/Senha não está totalmente configurado. Verifique se a opção "Senha" está marcada dentro do provedor no Console do Firebase.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Usuário não cadastrado ou credencial inválida.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Senha incorreta.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError(err.message || 'Erro inesperado ao realizar login.');
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLoadingStep('Conectando ao Google...');
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Erro ao entrar com Google');
    } finally {
      setLoading(false);
      setLoadingStep('');
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
              className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100"
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> 
                <span>{error}</span>
              </div>
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

          <div className="space-y-3">
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-sesi-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-800 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 shadow-xl shadow-sesi-blue/20 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span>VERIFICANDO...</span>
                  <span className="text-[10px] font-medium opacity-70 tracking-normal">{loadingStep}</span>
                </>
              ) : (
                <span className="flex items-center gap-3"><LogIn size={18} /> Entrar</span>
              )}
            </button>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-tight hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              <Chrome size={16} className="text-red-500" />
              Entrar com Google
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <a href="/" className="text-xs font-bold text-slate-400 hover:text-sesi-blue transition-colors uppercase tracking-tight block">← Retornar ao site público</a>
        </div>
      </motion.div>
    </div>
  );
}
