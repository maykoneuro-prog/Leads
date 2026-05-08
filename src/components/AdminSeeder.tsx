import React, { useState } from 'react';
import { doc, setDoc, writeBatch, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminSeeder() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMasterAdmin = user?.email === 'administrador@sesipe.com.br' || user?.email === 'maykon.euro@gmail.com';

  if (!isMasterAdmin) return null;

  const runSeed = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Starting client-side seed...');
      
      // 1. Ensure UserRole for Admin exists
      if (user) {
        await setDoc(doc(db, 'userRoles', user.uid), {
          email: user.email,
          role: 'Admin',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // 2. Schools Data from User
      const adminUsers = [
        { email: 'sesiibura@sesipe.com.br', pass: 'sesiibura@1234' },
        { email: 'sesipaulista@sesipe.com.br', pass: 'sesipaulista@1234' },
        { email: 'sesivascodagama@sesipe.com.br', pass: 'sesivascodagama@1234' },
        { email: 'sesicaruaru@sesipe.com.br', pass: 'sesicaruaru@1234' },
        { email: 'sesipetrolina@sesipe.com.br', pass: 'sesipetrolina@1234' },
        { email: 'sesiararipina@sesipe.com.br', pass: 'sesiararipina@1234' },
        { email: 'sesigoiana@sesipe.com.br', pass: 'sesigoiana@1234' },
        { email: 'sesiescada@sesipe.com.br', pass: 'sesiescada@1234' },
        { email: 'sesicamaragibe@sesipe.com.br', pass: 'sesicamaragibe@1234' },
        { email: 'sesicabo@sesipe.com.br', pass: 'sesicabo@1234' },
        { email: 'sesimoreno@sesipe.com.br', pass: 'sesimoreno@1234' },
        { email: 'sesibeljardim@sesipe.com.br', pass: 'sesibeljardim@1234' },
      ];

      setLoadingStep('Sincronizando contas de usuário...');
      const authSyncResp = await fetch('/api/sync-auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: adminUsers })
      });
      const authSyncData = await authSyncResp.json();
      
      const schoolsData = [
        { id: 'sesiibura', name: 'SESI Ibura', city: 'Recife', email: 'sesiibura@sesipe.com.br' },
        { id: 'sesipaulista', name: 'SESI Paulista', city: 'Paulista', email: 'sesipaulista@sesipe.com.br' },
        { id: 'sesivascodagama', name: 'SESI Vasco da Gama', city: 'Recife', email: 'sesivascodagama@sesipe.com.br' },
        { id: 'sesicaruaru', name: 'SESI Caruaru', city: 'Caruaru', email: 'sesicaruaru@sesipe.com.br' },
        { id: 'sesipetrolina', name: 'SESI Petrolina', city: 'Petrolina', email: 'sesipetrolina@sesipe.com.br' },
        { id: 'sesiararipina', name: 'SESI Araripina', city: 'Araripina', email: 'sesiararipina@sesipe.com.br' },
        { id: 'sesigoiana', name: 'SESI Goiana', city: 'Goiana', email: 'sesigoiana@sesipe.com.br' },
        { id: 'sesiescada', name: 'SESI Escada', city: 'Escada', email: 'sesiescada@sesipe.com.br' },
        { id: 'sesicamaragibe', name: 'SESI Camaragibe', city: 'Camaragibe', email: 'sesicamaragibe@sesipe.com.br' },
        { id: 'sesicabo', name: 'SESI Cabo de Santo Agostinho', city: 'Cabo de Santo Agostinho', email: 'sesicabo@sesipe.com.br' },
        { id: 'sesimoreno', name: 'SESI Moreno', city: 'Moreno', email: 'sesimoreno@sesipe.com.br' },
        { id: 'sesibeljardim', name: 'SESI Belo Jardim', city: 'Belo Jardim', email: 'sesibeljardim@sesipe.com.br' },
      ];

      setLoadingStep('Atualizando banco de dados...');
      const batch = writeBatch(db);
      
      // Schools
      for (const s of schoolsData) {
        // Default courses for most schools
        let offeredCourses = ['ensino-fundamental-i', 'ensino-fundamental-ii', 'ensino-medio'];
        
        // Custom logic for SESI Araripina and others if needed
        if (s.id === 'sesiararipina') {
           offeredCourses = ['ensino-fundamental-i', 'ensino-fundamental-ii', 'ensino-medio'];
        } else {
           offeredCourses = ['educacao-infantil', 'ensino-fundamental-i', 'ensino-fundamental-ii', 'ensino-medio', 'eja'];
        }

        batch.set(doc(db, 'schools', s.id), {
          name: s.name,
          city: s.city,
          active: true,
          offeredCourses
        }, { merge: true });

        const userData = authSyncData.results.find((r: any) => r.email === s.email);
        if (userData && userData.uid) {
          batch.set(doc(db, 'userRoles', userData.uid), {
            email: s.email,
            role: 'SchoolOperator',
            schoolId: s.id,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      // Courses
      const courses = [
        { 
          name: 'Educação Infantil', 
          grades: ['Infantil I', 'Infantil II', 'Infantil III', 'Infantil IV', 'Infantil V'] 
        },
        { 
          name: 'Ensino Fundamental I', 
          grades: ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'] 
        },
        { 
          name: 'Ensino Fundamental II', 
          grades: ['6º Ano', '7º Ano', '8º Ano', '9º Ano'] 
        },
        { 
          name: 'Ensino Médio', 
          grades: ['1º Ano', '2º Ano', '3º Ano'] 
        },
        { 
          name: 'EJA', 
          grades: ['EJA I', 'EJA II', 'EJA III', 'EJA IV'] 
        }
      ];

      // Explicitly delete 'ensino-religioso' if it exists to avoid confusion
      batch.delete(doc(db, 'courses', 'ensino-religioso'));

      for (const c of courses) {
        const id = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        batch.set(doc(db, 'courses', id), {
          name: c.name,
          grades: c.grades
        }, { merge: true });
      }

      await batch.commit();
      setSuccess(true);
      console.log('Seed completed successfully!');
    } catch (err: any) {
      console.error('Seed error:', err);
      setError(err.message || 'Falha ao sincronizar banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
          <Database size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Sincronização do Sistema</h3>
          <p className="text-sm text-slate-500">Ferramenta para inicializar unidades e cursos.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3 text-green-600 text-sm">
          <CheckCircle size={18} />
          Banco de dados sincronizado com sucesso!
        </div>
      )}

      <button
        onClick={runSeed}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors font-medium"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
        {loading ? (loadingStep || 'Sincronizando...') : 'Sincronizar Unidades e Cursos'}
      </button>
    </div>
  );
}
