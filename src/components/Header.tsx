import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export default function Header() {
  const { roleData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <header className="bg-sesi-blue text-white h-16 flex items-center justify-between px-6 shrink-0 shadow-md z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded flex items-center justify-center font-black text-sesi-blue text-xl">S</div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight tracking-tight uppercase">SESI PE</span>
          <span className="text-xs opacity-80 uppercase tracking-widest font-medium">Cadastro de Interesse</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right mr-2 hidden md:block">
          <p className="text-sm font-medium">{roleData?.email}</p>
          <p className="text-[10px] opacity-70 uppercase tracking-wider">
            {roleData?.role === 'Admin' ? 'Acesso: Geral' : 'Acesso: Unidade'}
          </p>
        </div>
        <button 
          onClick={handleLogout}
          className="h-9 px-4 bg-white/10 hover:bg-white/20 rounded-md text-sm border border-white/20 transition-colors flex items-center gap-2"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
