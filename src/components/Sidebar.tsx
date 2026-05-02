import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  BarChart3, 
  Users, 
  Settings, 
  School as SchoolIcon,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { roleData } = useAuth();

  const navItems = [
    { name: 'Dashboard Geral', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Gestão de Leads', path: '/admin/leads', icon: Users },
    { name: 'Unidades e Cursos', path: '/admin/settings', icon: SchoolIcon, adminOnly: true },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      <nav className="p-4 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Menu Principal</div>
        {navItems.map((item) => {
          if (item.adminOnly && roleData?.role !== 'Admin') return null;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                isActive 
                  ? "bg-blue-50 text-sesi-blue shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <item.icon size={18} />
              {item.name}
              {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <div className="bg-sesi-blue text-white p-4 rounded-xl shadow-inner">
          <h4 className="text-[10px] font-bold uppercase opacity-60 mb-2 tracking-widest">Informação</h4>
          <p className="text-[11px] leading-relaxed">
            {roleData?.role === 'Admin' 
              ? 'Você possui acesso total a todas as unidades do SESI PE.'
              : 'Gerencie os leads específicos da sua unidade de atendimento.'}
          </p>
        </div>
      </div>
    </aside>
  );
}
