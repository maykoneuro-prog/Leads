import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Lead, School, Course, SchoolOffer } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Users, School as SchoolIcon, BookOpen, Clock, TrendingUp, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import AdminSeeder from '../components/AdminSeeder';

export default function Dashboard() {
  const { roleData } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleData) return;

    const fetchData = async () => {
      try {
        let leadQuery = collection(db, 'leads');
        let offerQuery = collection(db, 'schoolOffers');
        
        if (roleData.role === 'SchoolOperator' && roleData.schoolId) {
          leadQuery = query(leadQuery, where('schoolId', '==', roleData.schoolId)) as any;
          offerQuery = query(offerQuery, where('schoolId', '==', roleData.schoolId)) as any;
        }
        
        const [leadSnap, schoolSnap, courseSnap, offerSnap] = await Promise.all([
          getDocs(leadQuery).catch(e => handleFirestoreError(e, OperationType.LIST, 'leads')),
          getDocs(collection(db, 'schools')).catch(e => handleFirestoreError(e, OperationType.LIST, 'schools')),
          getDocs(collection(db, 'courses')).catch(e => handleFirestoreError(e, OperationType.LIST, 'courses')),
          getDocs(offerQuery).catch(e => handleFirestoreError(e, OperationType.LIST, 'schoolOffers'))
        ]) as any;

        setLeads(leadSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as Lead)));
        setSchools(schoolSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as School)));
        setCourses(courseSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as Course)));
        const currentOffers = offerSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as SchoolOffer));
        
        setStats({
          totalSlots: currentOffers.reduce((acc: number, curr: SchoolOffer) => acc + curr.slots, 0),
          totalEnrolled: currentOffers.reduce((acc: number, curr: SchoolOffer) => acc + curr.enrolledCount, 0),
        });

        setLoading(false);
      } catch (error) {
        console.error('Dashboard Fetch Error:', error);
      }
    };

    fetchData();
  }, [roleData]);

  const [stats, setStats] = useState({ totalSlots: 0, totalEnrolled: 0 });

  if (loading) return <div className="text-gray-500 animate-pulse">Carregando métricas...</div>;

  // Process data for charts
  const statusData = [
    { name: 'Novo', value: leads.filter(l => l.status === 'New').length },
    { name: 'Contatado', value: leads.filter(l => l.status === 'Contacted').length },
    { name: 'Interessado', value: leads.filter(l => l.status === 'Interested').length },
    { name: 'Matriculado', value: leads.filter(l => l.status === 'Enrolled').length },
    { name: 'Cancelado', value: leads.filter(l => l.status === 'Cancelled').length },
  ];

  const schoolData = schools.map(s => ({
    name: s.name,
    leads: leads.filter(l => l.schoolId === s.id).length
  })).sort((a, b) => b.leads - a.leads);

  const courseData = courses.map(c => ({
    name: c.name,
    leads: leads.filter(l => l.courseId === c.id).length
  }));

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#ef4444'];

  const StatCard = ({ title, value, icon: Icon, color, details }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
    >
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className={cn("text-3xl font-bold", color ? color : "text-slate-800")}>{value}</p>
          <div className={cn("p-2 rounded-lg bg-slate-50", color ? color.replace('text-', 'bg-').replace('600', '100') : "bg-slate-50 text-slate-400")}>
            <Icon size={18} />
          </div>
        </div>
      </div>
      {details && <p className="text-xs text-slate-500 mt-2 font-medium">{details}</p>}
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Estratégico</h1>
          <p className="text-slate-500">Consolidado de todas as unidades SESI Pernambuco</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors">Exportar Dados</button>
        </div>
      </header>

      <AdminSeeder />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Interesses" value={leads.length} icon={Users} color="text-slate-800" details={`${leads.length > 0 ? '+12% este mês' : 'Iniciando captação'}`} />
        <StatCard title="Ocupação de Vagas" value={stats.totalEnrolled} icon={TrendingUp} color="text-sesi-blue" details={`De ${stats.totalSlots} vagas ofertadas`} />
        <StatCard title="Matriculados" value={leads.filter(l => l.status === 'Enrolled').length} icon={GraduationCap} color="text-green-600" details={`${leads.length > 0 ? ((leads.filter(l => l.status === 'Enrolled').length / leads.length) * 100).toFixed(1) : 0}% de conversão`} />
        <StatCard title="Unidades Ativas" value={schools.length} icon={SchoolIcon} color="text-slate-400" details={`Rede SESI Pernambuco`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Demanda por Nível de Ensino</h2>
            <select className="text-[10px] border border-slate-200 rounded px-2 py-1 bg-slate-50 outline-none font-bold text-slate-500">
              <option>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="leads" fill="#004C91" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Status dos Leads</h2>
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-y-3">
            {statusData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-slate-500">{s.name}:</span>
                <span className="text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {roleData?.role === 'Admin' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Ranking de Captação por Unidade</h2>
            <button className="text-xs font-bold text-sesi-blue hover:underline">Ver relatório completo</button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip />
                <Bar dataKey="leads" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
