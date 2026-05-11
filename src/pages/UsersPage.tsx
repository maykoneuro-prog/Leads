import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Key, AlertCircle, CheckCircle, Search, Loader2, Edit3, X, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface UserRole {
  id: string; // This is the UID
  name?: string;
  email: string;
  role: string;
  schoolId?: string;
  updatedAt: any;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [schools, setSchools] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editForm, setEditForm] = useState({ name: '', role: 'SchoolOperator', schoolId: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'SchoolOperator', schoolId: '' });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Fetch Schools for dropdown
    getDocs(collection(db, 'schools')).then(snap => {
      setSchools(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });

    const q = query(collection(db, 'userRoles'), orderBy('email'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserRole));
      setUsers(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateUser = async (id: string) => {
    try {
      await updateDoc(doc(db, 'userRoles', id), {
        name: editForm.name,
        role: editForm.role,
        schoolId: editForm.schoolId,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
      setEditingId(null);
    } catch (error: any) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: 'Falha ao atualizar: ' + error.message });
    }
  };

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

      const text = await resp.text();
      if (!text || text.trim() === '') {
        throw new Error(`Servidor retornou resposta vazia (Status ${resp.status}).`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Resposta do servidor não é um JSON válido: ${text.substring(0, 50)}...`);
      }

      if (!resp.ok) {
        throw new Error(data.error || `Falha ao atualizar senha (Status ${resp.status})`);
      }

      setMessage({ type: 'success', text: `Senha de ${email} atualizada com sucesso!` });
      setResettingId(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || createForm.password.length < 6) {
      setMessage({ type: 'error', text: 'Preencha todos os campos. A senha deve ter 6+ caracteres.' });
      return;
    }

    setCreating(true);
    try {
      const emailFixed = createForm.email.trim();
      // 1. Create in Firebase Auth via REST API (server)
      const resp = await fetch('/api/sync-auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          users: [{ email: emailFixed, pass: createForm.password }] 
        })
      });

      const text = await resp.text();
      if (!text || text.trim() === '') {
        throw new Error(`O servidor retornou uma resposta vazia (Status ${resp.status}).`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON:', text);
        throw new Error(`Resposta do servidor não é um JSON válido: ${text.substring(0, 100)}...`);
      }

      if (!resp.ok || !data.results || data.results[0].status === 'error') {
        const errorDetail = data.results?.[0]?.message || data.error || 'Falha desconhecida no servidor';
        throw new Error(`Erro na criação: ${errorDetail}`);
      }

      // 2. Create Role Record in Firestore
      const uid = data.results[0].uid;
      await setDoc(doc(db, 'userRoles', uid), {
        uid,
        name: createForm.name,
        email: emailFixed,
        role: createForm.role,
        schoolId: createForm.schoolId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage({ type: 'success', text: `Usuário ${createForm.email} criado com sucesso!` });
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', role: 'SchoolOperator', schoolId: '' });
    } catch (error: any) {
      console.error('Create error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (user: UserRole) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || '',
      role: user.role,
      schoolId: user.schoolId || ''
    });
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
        
        <div className="flex flex-col md:flex-row items-center gap-3">
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
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sesi-blue text-white rounded-lg font-bold hover:bg-blue-800 transition-all text-xs uppercase"
          >
            {showCreate ? <X size={16} /> : <Users size={16} />}
            {showCreate ? 'Cancelar' : 'Novo Usuário'}
          </button>
        </div>
      </header>

      {showCreate && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4"
        >
          <h2 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
            <Edit3 size={14} className="text-blue-600" /> Cadastrar Novo Usuário (Acesso ao Sistema)
          </h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Nome Completo</label>
              <input 
                required
                type="text" 
                value={createForm.name}
                onChange={e => setCreateForm({...createForm, name: e.target.value})}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-300 transition-all" 
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">E-mail / Credencial</label>
              <input 
                required
                type="email" 
                value={createForm.email}
                onChange={e => setCreateForm({...createForm, email: e.target.value})}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-300 transition-all" 
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Senha Inicial</label>
              <input 
                required
                type="password" 
                value={createForm.password}
                onChange={e => setCreateForm({...createForm, password: e.target.value})}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-300 transition-all" 
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Nível de Acesso</label>
              <select 
                value={createForm.role}
                onChange={e => setCreateForm({...createForm, role: e.target.value})}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-300 transition-all"
              >
                <option value="Admin">Administrador Total</option>
                <option value="SchoolOperator">Operador de Escola</option>
                <option value="Viewer">Apenas Visualizador</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Unidade (Vínculos)</label>
              <select 
                value={createForm.schoolId}
                onChange={e => setCreateForm({...createForm, schoolId: e.target.value})}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-300 transition-all"
              >
                <option value="">Nenhuma Unidade</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                type="submit"
                disabled={creating}
                className="w-full bg-sesi-blue text-white rounded-xl py-2.5 font-bold hover:bg-blue-800 transition-all disabled:opacity-50 text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-sesi-blue/20"
              >
                {creating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                {creating ? 'Processando...' : 'Cadastrar Usuário'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

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
                      <div className="flex flex-col">
                        {editingId === user.id ? (
                          <input 
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="text-sm font-medium p-1 border border-blue-200 rounded outline-none"
                            placeholder="Nome Completo"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">{user.name || 'Sem nome'}</span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === user.id ? (
                      <select 
                        value={editForm.role}
                        onChange={e => setEditForm({...editForm, role: e.target.value})}
                        className="text-xs font-semibold p-1 border border-blue-200 rounded outline-none"
                      >
                        <option value="Admin">Admin</option>
                        <option value="SchoolOperator">Operador</option>
                        <option value="Viewer">Visualizador</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === user.id ? (
                      <select 
                        value={editForm.schoolId}
                        onChange={e => setEditForm({...editForm, schoolId: e.target.value})}
                        className="text-[10px] font-bold p-1 border border-blue-200 rounded outline-none w-full max-w-[150px]"
                      >
                        <option value="">Nenhuma</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-slate-600 font-mono text-xs">{schools.find(s => s.id === user.schoolId)?.name || user.schoolId || '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                    {editingId === user.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateUser(user.id)}
                          className="bg-green-600 text-white p-1.5 rounded-lg hover:bg-green-700 transition-colors"
                          title="Salvar alterações"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-200 text-slate-600 p-1.5 rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(user)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar Perfil"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}

                    {resettingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="Nova senha"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded text-sm outline-none w-24"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleResetPassword(user.email)}
                            className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                            title="Confirmar Reset"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => { setResettingId(null); setNewPassword(''); }}
                            className="bg-slate-200 text-slate-600 p-1.5 rounded-lg hover:bg-slate-300 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      !editingId && (
                        <button
                          onClick={() => setResettingId(user.id)}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                          title="Redefinir Senha"
                        >
                          <Key size={16} />
                        </button>
                      )
                    )}
                    </div>
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
