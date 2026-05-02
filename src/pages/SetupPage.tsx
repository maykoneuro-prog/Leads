import React, { useState } from 'react';
import { collection, addDoc, getDocs, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { INITIAL_SCHOOLS, INITIAL_COURSES } from '../constants';
import { UserRole } from '../types';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const handleSetup = async () => {
    setLoading(true);
    addLog('Iniciando configuração do sistema...');

    try {
      // 1. Create Courses
      const courseSnap = await getDocs(collection(db, 'courses'));
      if (courseSnap.empty) {
        addLog('Criando cursos padrão...');
        for (const c of INITIAL_COURSES) {
          await addDoc(collection(db, 'courses'), c);
        }
      } else {
        addLog('Cursos já cadastrados.');
      }

      // 2. Create Schools
      const schoolSnap = await getDocs(collection(db, 'schools'));
      if (schoolSnap.empty) {
        addLog('Criando escolas padrão...');
        for (const s of INITIAL_SCHOOLS) {
          await addDoc(collection(db, 'schools'), s);
        }
      } else {
        addLog('Escolas já cadastradas.');
      }

      addLog('Setup de metadados concluído com sucesso!');
      addLog('NOTA: Para criar os usuários (Admin e Escolas), é necessário usar o Firebase Console ou implementar um fluxo de convite. Devido às restrições de segurança do Client SDK, não podemos criar múltiplos usuários autenticados em lote sem deslogar.');
      addLog('Por favor, crie manualmente no Firebase Console:');
      addLog('1. admin@sesipe.com.br / Abc@1234');
      addLog('2. (escola)@sesipe.com.br / (escola)@1234');
      addLog('Após criar o usuário Admin, vincule-o na coleção userRoles com role="Admin".');
      
    } catch (err: any) {
      addLog(`ERRO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-mono">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 border-b pb-2">Sistema SESI PE - Setup</h1>
        <p className="text-sm text-gray-600">
          Este utilitário irá configurar as coleções iniciais de escolas e cursos no Firestore. 
          Certifique-se de que o Firebase está configurado corretamente.
        </p>
        
        <button 
          onClick={handleSetup}
          disabled={loading}
          className="bg-blue-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Inicializar Metadados'}
        </button>

        <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto text-xs space-y-1">
          {log.map((msg, i) => <div key={i}>{msg}</div>)}
          {log.length === 0 && <div className="opacity-50"># Aguardando comando...</div>}
        </div>

        <div className="text-xs text-gray-400">
          * A criação de usuários requer permissão de administrador ou acesso ao console do Firebase.
        </div>
      </div>
    </div>
  );
}
