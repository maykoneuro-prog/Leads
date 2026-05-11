import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Lead, School, Course, SchoolOffer } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Users, School as SchoolIcon, TrendingUp, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import AdminSeeder from '../components/AdminSeeder';

export default function Dashboard() {
  const { user, roleData, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ totalLeads: 0, totalSlots: 0, totalEnrolled: 0, enrolledLeads: 0 });

  const adminEmails = ['maykon.euro@gmail.com', 'administrador@sesipe.com.br'];
  const isMaster = user?.email && adminEmails.includes(user.email.toLowerCase());

  useEffect(() => {
    if (authLoading) return;
    
    // If not master and no role data, we can't fetch database content safely
    if (!roleData && !isMaster) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        let leadBaseQuery = collection(db, 'leads');
        let offerQuery = collection(db, 'schoolOffers');
        
        if (roleData?.role === 'SchoolOperator' && roleData?.schoolId) {
          const sId = roleData.schoolId;
          leadBaseQuery = query(leadBaseQuery, where('schoolId', '==', sId)) as any;
          offerQuery = query(offerQuery, where('schoolId', '==', sId)) as any;
        }

        // 1. Precise Counts (Fast & Low Data)
        // Wrapped in try/catch to avoid blocking the whole page if count fails (e.g. missing index)
        let totalLeads = 0;
        let enrolledLeads = 0;
        try {
          const [totalLeadsCount, enrolledLeadsCount] = await Promise.all([
            getCountFromServer(leadBaseQuery),
            getCountFromServer(query(leadBaseQuery, where('status', '==', 'Enrolled')))
          ]);
          totalLeads = totalLeadsCount.data().count;
          enrolledLeads = enrolledLeadsCount.data().count;
        } catch (e) {
          console.warn("Count query failed (likely missing index):", e);
        }

        // 2. Fetch Data for Charts and Lists (Limited)
        const [leadSnap, schoolSnap, courseSnap, offerSnap] = await Promise.all([
          getDocs(query(leadBaseQuery, orderBy('createdAt', 'desc'), limit(500))).catch(e => handleFirestoreError(e, OperationType.LIST, 'leads')),
          getDocs(collection(db, 'schools')).catch(e => handleFirestoreError(e, OperationType.LIST, 'schools')),
          getDocs(collection(db, 'courses')).catch(e => handleFirestoreError(e, OperationType.LIST, 'courses')),
          getDocs(offerQuery).catch(e => handleFirestoreError(e, OperationType.LIST, 'schoolOffers'))
        ]) as any;

        const currentLeads = leadSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as Lead));
        const currentOffers = offerSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as SchoolOffer));

        setLeads(currentLeads);
        setSchools(schoolSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as School)));
        setCourses(courseSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as object) } as Course)));
        
        setCounts({
          totalLeads: totalLeads || currentLeads.length,
          enrolledLeads: enrolledLeads || currentLeads.filter(l => l.status === 'Enrolled').length,
          totalSlots: currentOffers.reduce((acc: number, curr: SchoolOffer) => acc + curr.slots, 0),
          totalEnrolled: currentOffers.reduce((acc: number, curr: SchoolOffer) => acc + curr.enrolledCount, 0),
        });

      } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        setFetchError('Ocorreu um erro ao carregar os dados. Verifique sua conexão ou permissões.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roleData, authLoading, isMaster]);

  // Memoize chart data to prevent recalculation on every render
  const statusData = React.useMemo(() => [
    { name: 'Novo', value: leads.filter(l => l.status === 'New').length },
    { name: 'Contatado', value: leads.filter(l => l.status === 'Contacted').length },
    { name: 'Interessado', value: leads.filter(l => l.status === 'Interested').length },
    { name: 'Matriculado', value: leads.filter(l => l.status === 'Enrolled').length },
    { name: 'Cancelado', value: leads.filter(l => l.status === 'Cancelled').length },
  ], [leads]);

  const schoolData = React.useMemo(() => schools.map(s => ({
    name: s.name,
    leads: leads.filter(l => l.schoolId === s.id).length
  })).sort((a, b) => b.leads - a.leads).slice(0, 5), [schools, leads]);

  const courseData = React.useMemo(() => courses.map(c => ({
    name: c.name,
    leads: leads.filter(l => l.courseId === c.id).length
  })), [courses, leads]);

  if (authLoading) return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-12 h-12 border-4 border-sesi-blue border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Verificando credenciais...</p>
    </div>
  );

  if (!roleData && !isMaster) return (
    <div className="p-8 text-center bg-white rounded-xl border border-slate-200 mt-10 max-w-md mx-auto font-sans shadow-sm">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
        <Users size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
      <p className="text-slate-500 leading-relaxed">Seu usuário não possui permissão vinculada a nenhuma unidade ou perfil administrativo.</p>
      {isMaster && <div className="mt-6 border-t pt-6"><AdminSeeder /></div>}
    </div>
  );

  if (loading) return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-12 h-12 border-4 border-sesi-blue border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium tracking-tight">Carregando métricas estratégicas...</p>
    </div>
  );

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
          {/* O AdminSeeder é essencial para o primeiro acesso */}
          <AdminSeeder />
        </div>
      </header>
      
      {fetchError && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm flex items-center gap-3">
          <TrendingUp className="shrink-0" />
          <p>Alguns dados podem estar incompletos enquanto os índices do banco de dados são processados. Tente atualizar em alguns instantes.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Interesses" value={counts.totalLeads} icon={Users} color="text-slate-800" details={`${counts.totalLeads > 0 ? 'Base histórica total' : 'Iniciando captação'}`} />
        <StatCard title="Ocupação de Vagas" value={counts.totalEnrolled} icon={TrendingUp} color="text-sesi-blue" details={`De ${counts.totalSlots} vagas ofertadas`} />
        <StatCard title="Matriculados" value={counts.enrolledLeads} icon={GraduationCap} color="text-green-600" details={`${counts.totalLeads > 0 ? ((counts.enrolledLeads / counts.totalLeads) * 100).toFixed(1) : 0}% de conversão`} />
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
