import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Key, AlertCircle, CheckCircle, Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface UserRole {
  id: string; // This is the UID
  email: string;
  role: string;
  schoolId?: string;
  updatedAt: any;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'userRoles'), orderBy('email'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserRole));
      setUsers(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResetPassword = async (email: string) => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    try {
      setMessage(null);
      const resp = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao atualizar senha');

      setMessage({ type: 'success', text: `Senha de ${email} atualizada com sucesso!` });
      setResettingId(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const filtered = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Usuários</h1>
          <p className="text-slate-500 text-sm">Controle de acessos e redefinição de senhas.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </header>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-black/5 rounded">
            <Loader2 size={16} className="rotate-45" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Usuário (E-mail)</th>
                <th className="px-6 py-4 font-semibold">Nível de Acesso</th>
                <th className="px-6 py-4 font-semibold">Unidade Relacionada</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-500 text-sm">Carregando usuários...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-slate-500 text-sm">Nenhum usuário encontrado.</p>
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        <Users size={16} />
                      </div>
                      <span className="font-medium text-slate-900">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 font-mono text-xs">{user.schoolId || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {resettingId === user.id ? (
                      <div className="flex flex-col md:flex-row items-end md:items-center justify-end gap-2">
                        <input
                          type="password"
                          placeholder="Nova senha"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded text-sm outline-none w-32"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleResetPassword(user.email)}
                            className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 transition-colors"
                            title="Salvar nova senha"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => { setResettingId(null); setNewPassword(''); }}
                            className="bg-slate-200 text-slate-600 p-1 rounded hover:bg-slate-300 transition-colors"
                          >
                            <Loader2 size={14} className="rotate-45" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResettingId(user.id)}
                        className="flex items-center gap-1 ml-auto px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                      >
                        <Key size={12} />
                        Redefinir Senha
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
