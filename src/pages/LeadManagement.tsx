import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Lead, School, Course } from '../types';
import { Search, Filter, MoreHorizontal, MessageCircle, Mail, Phone, Trash2, Check, X, Edit2, GraduationCap } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function LeadManagement() {
  const { roleData } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      let leadQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc')) as any;
      if (roleData?.role === 'SchoolOperator' && roleData.schoolId) {
        leadQuery = query(collection(db, 'leads'), where('schoolId', '==', roleData.schoolId), orderBy('createdAt', 'desc')) as any;
      }
      
      const [leadSnap, schoolSnap, courseSnap] = await Promise.all([
        getDocs(leadQuery),
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'courses'))
      ]);

      setLeads(leadSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Lead)));
      setSchools(schoolSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as School)));
      setCourses(courseSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Course)));
      setLoading(false);
    };

    fetchData();
  }, [roleData]);

  const updateStatus = async (leadId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status,
        updatedAt: serverTimestamp()
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: status as any } : l));
      if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status: status as any });
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status.');
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setSelectedLead(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir lead.');
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(filter.toLowerCase()) || 
                          l.email.toLowerCase().includes(filter.toLowerCase()) ||
                          l.phone.includes(filter);
    const matchesStatus = statusFilter === '' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Contacted': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Interested': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Enrolled': return 'bg-green-100 text-green-600 border-green-200';
      case 'Cancelled': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-400 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'New': return 'Novo';
      case 'Contacted': return 'Contato';
      case 'Interested': return 'Interessado';
      case 'Enrolled': return 'Matriculado';
      case 'Cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse">Carregando base de leads...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Leads</h1>
          <p className="text-sm text-slate-500">Acompanhamento de intenções registradas no portal</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Nome, e-mail ou telefone..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sesi-blue/20 focus:border-sesi-blue transition w-64 md:w-80 text-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <select 
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sesi-blue/20 focus:border-sesi-blue transition text-sm font-medium text-slate-600"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Filtro: Status</option>
            <option value="New">Novo</option>
            <option value="Contacted">Contatado</option>
            <option value="Interested">Interessado</option>
            <option value="Enrolled">Matriculado</option>
            <option value="Cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidato</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade e Nível</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registro</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeads.map(lead => (
              <tr 
                key={lead.id} 
                className="hover:bg-slate-50 transition cursor-pointer"
                onClick={() => setSelectedLead(lead)}
              >
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{lead.name}</div>
                    <div className="text-[11px] text-slate-400">{lead.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">
                      {schools.find(s => s.id === lead.schoolId)?.name || '---'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {courses.find(c => c.id === lead.courseId)?.name} • {lead.grade}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                  {lead.createdAt ? formatDate(lead.createdAt.toDate()) : '---'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1.5 hover:bg-white rounded-md border border-transparent hover:border-slate-200 text-slate-400 transform transition-transform active:scale-90">
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400 bg-white">
                  <div className="flex flex-col items-center gap-2">
                    <Filter size={32} className="opacity-20" />
                    <p className="italic text-sm">Nenhum interesse encontrado para os critérios selecionados.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrando {filteredLeads.length} leads de {leads.length}</p>
          <a href="#" className="text-[10px] font-bold text-sesi-blue hover:underline uppercase tracking-tight">Ver arquivo completo</a>
        </div>
      </div>

      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-50">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-white h-full w-full max-w-md p-8 shadow-2xl overflow-y-auto space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Lead</h2>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <section className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Informações Pessoais</label>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-lg font-bold text-gray-800">{selectedLead.name}</p>
                    <p className="text-gray-600 flex items-center gap-2 mt-1"><Mail size={14}/> {selectedLead.email}</p>
                    <p className="text-gray-600 flex items-center gap-2"><Phone size={14}/> {selectedLead.phone}</p>
                    <p className="text-sm text-gray-500 mt-2">Responsável: <span className="font-semibold text-gray-700">{selectedLead.guardianName}</span></p>
                  </div>
                </section>

                <section className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ações de Gestão</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => updateStatus(selectedLead.id, 'Contacted')}
                      className="p-3 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-yellow-100 transition"
                    >
                      <Phone size={16} /> Marcar Contato
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedLead.id, 'Interested')}
                      className="p-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition"
                    >
                      <Check size={16} /> Demonstrar Interesse
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedLead.id, 'Enrolled')}
                      className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition"
                    >
                      <GraduationCap size={16} /> Matricular
                    </button>
                    <button 
                      onClick={() => deleteLead(selectedLead.id)}
                      className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition"
                    >
                      <Trash2 size={16} /> Excluir Lead
                    </button>
                  </div>
                </section>

                <div className="pt-8 flex flex-col gap-3">
                   <a 
                    href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}?text=Olá ${selectedLead.guardianName}, falamos do SESI ${schools.find(s => s.id === selectedLead.schoolId)?.name}. Vimos seu interesse para ${selectedLead.name}...`}
                    target="_blank"
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100"
                   >
                     <MessageCircle size={20} /> Abrir WhatsApp
                   </a>
                   <a 
                    href={`mailto:${selectedLead.email}?subject=Interesse de Matrícula SESI PE&body=Prezada(o) ${selectedLead.guardianName}...`}
                    className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition"
                   >
                     <Mail size={20} /> Enviar E-mail
                   </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
