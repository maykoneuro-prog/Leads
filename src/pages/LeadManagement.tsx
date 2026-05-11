import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy, updateDoc, doc, deleteDoc, serverTimestamp, arrayUnion, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Lead, School, Course, SchoolOffer } from '../types';
import { Search, Filter, MessageCircle, Mail, Phone, Trash2, Check, X, Edit2, GraduationCap, History, Send, Loader2 } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function LeadManagement() {
  const { roleData, user: authUser, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Interaction Modal State
  const [interactionModal, setInteractionModal] = useState<{ open: boolean, comment: string, lead: Lead | null, type: 'whatsapp' | 'note' }>({
    open: false,
    comment: '',
    lead: null,
    type: 'note'
  });

  useEffect(() => {
    if (authLoading) return;
    
    const adminEmails = ['maykon.euro@gmail.com', 'administrador@sesipe.com.br'];
    const isMaster = authUser?.email && adminEmails.includes(authUser.email.toLowerCase());

    if (!roleData && !isMaster) {
      setLoading(false);
      return;
    }
    
    if (roleData?.role === 'SchoolOperator' && roleData?.schoolId) {
      setSchoolFilter(roleData.schoolId);
    }

    // Static data (schools/courses)
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setSchools(snap.docs.map(d => ({ id: d.id, ...d.data() } as School)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'schools'));
    
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'courses'));

    // Dynamic leads data (Limited to 500 for performance)
    let leadQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(500));
    if (roleData?.role === 'SchoolOperator' && roleData?.schoolId) {
      const sId = roleData.schoolId;
      leadQuery = query(collection(db, 'leads'), where('schoolId', '==', sId), orderBy('createdAt', 'desc'), limit(500));
    }

    const unsubscribeLeads = onSnapshot(leadQuery, (snap) => {
      setLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'leads'));

    return () => {
      unsubSchools();
      unsubCourses();
      unsubscribeLeads();
    };
  }, [roleData, authLoading, authUser]);

  const addLog = async (leadId: string, action: string, comment?: string) => {
    if (!authUser || !roleData) return;
    
    const logEntry = {
      userId: authUser.uid,
      userName: authUser.email || 'Usuário',
      action,
      comment,
      timestamp: new Date()
    };

    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        logs: arrayUnion(logEntry),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}/logs`);
    }
  };

  const updateStatus = async (leadId: string, status: string, comment?: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status,
        updatedAt: serverTimestamp()
      });
      await addLog(leadId, `Status alterado para ${getStatusLabel(status)}`, comment);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}/status`);
    }
  };

  const recordInteraction = async () => {
    if (!interactionModal.lead || !interactionModal.comment.trim()) {
      alert('Por favor, registre a observação.');
      return;
    }

    try {
      setLoading(true);
      const lead = interactionModal.lead;
      
      const actionLabel = interactionModal.type === 'whatsapp' 
        ? 'Contato via WhatsApp realizado' 
        : 'Observação interna registrada';

      // Update status to contacted if it was new and via WhatsApp
      const newStatus = (lead.status === 'New' && interactionModal.type === 'whatsapp') ? 'Contacted' : lead.status;
      
      await updateDoc(doc(db, 'leads', lead.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await addLog(lead.id, actionLabel, interactionModal.comment);
      
      setInteractionModal({ open: false, comment: '', lead: null, type: 'note' });
      alert('Interação registrada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao registrar interação.');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (lead: Lead) => {
    const school = schools.find(s => s.id === lead.schoolId);
    const message = `Olá ${lead.guardianName}, falamos do SESI ${school?.name || ''}. Vimos seu interesse para ${lead.name} no ${lead.grade}. Podemos conversar?`;
    const url = `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
    setInteractionModal({ open: true, comment: '', lead, type: 'whatsapp' });
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setSelectedLead(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${leadId}`);
    }
  };

  const filteredLeads = React.useMemo(() => leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(filter.toLowerCase()) || 
                          l.email.toLowerCase().includes(filter.toLowerCase()) ||
                          l.phone.includes(filter);
    const matchesStatus = statusFilter === '' || l.status === statusFilter;
    const matchesSchool = schoolFilter === '' || l.schoolId === schoolFilter;
    const matchesCourse = courseFilter === '' || l.courseId === courseFilter;
    return matchesSearch && matchesStatus && matchesSchool && matchesCourse;
  }), [leads, filter, statusFilter, schoolFilter, courseFilter]);

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

  if (authLoading || (loading && leads.length === 0)) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="animate-spin text-sesi-blue" size={32} />
      <p className="text-slate-500 font-medium animate-pulse">Carregando base de leads...</p>
    </div>
  );

  if (!authUser) return <div className="p-8 text-center bg-white rounded-xl border border-slate-200">Por favor, faça login para acessar os leads.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Leads</h1>
          <p className="text-sm text-slate-500">Acompanhamento de intenções registradas no portal</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Nome, e-mail ou telefone..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sesi-blue/20 focus:border-sesi-blue transition w-64 text-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          {roleData?.role === 'Admin' && (
            <select 
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sesi-blue/20 focus:border-sesi-blue transition text-sm font-medium text-slate-600"
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
            >
              <option value="">Todas Unidades</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          <select 
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sesi-blue/20 focus:border-sesi-blue transition text-sm font-medium text-slate-600"
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
          >
            <option value="">Todos Níveis</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select 
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sesi-blue/20 focus:border-sesi-blue transition text-sm font-medium text-slate-600"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Todos Status</option>
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
                      onClick={() => openWhatsApp(selectedLead)}
                      className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition"
                    >
                      <MessageCircle size={16} /> Contato WhatsApp
                    </button>
                    <button 
                      onClick={() => setInteractionModal({ open: true, comment: '', lead: selectedLead, type: 'note' })}
                      className="p-3 bg-slate-50 text-slate-700 border border-slate-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition"
                    >
                      <Edit2 size={16} /> Adicionar Nota
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

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <History size={14} />
                    Histórico de Interações
                  </div>
                  <div className="space-y-3">
                    {selectedLead.logs?.sort((a: any, b: any) => {
                      const timeA = a.timestamp?.toDate?.() || a.timestamp;
                      const timeB = b.timestamp?.toDate?.() || b.timestamp;
                      return timeB - timeA;
                    }).map((log, idx) => (
                      <div key={idx} className="relative pl-4 border-l-2 border-slate-100 pb-2">
                        <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-200 border-2 border-white" />
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          {log.timestamp?.toDate ? formatDate(log.timestamp.toDate()) : formatDate(new Date(log.timestamp))} • {log.userName}
                        </div>
                        <div className="text-xs font-bold text-slate-700">{log.action}</div>
                        {log.comment && (
                          <div className="mt-1 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-100">
                            {log.comment}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!selectedLead.logs || selectedLead.logs.length === 0) && (
                      <p className="text-xs text-slate-400 italic">Nenhum histórico registrado ainda.</p>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {interactionModal.open && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className={cn("p-6 text-white", interactionModal.type === 'whatsapp' ? "bg-green-600" : "bg-sesi-blue")}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold">
                    {interactionModal.type === 'whatsapp' ? 'Registro de Contato' : 'Nova Observação'}
                  </h3>
                  {interactionModal.type === 'whatsapp' ? (
                    <MessageCircle size={24} className="opacity-50" />
                  ) : (
                    <Edit2 size={24} className="opacity-50" />
                  )}
                </div>
                <p className="text-sm opacity-90">
                  {interactionModal.type === 'whatsapp' 
                    ? `WhatsApp aberto para ${interactionModal.lead?.guardianName}. O que o responsável falou?`
                    : `Adicione uma nota interna sobre o atendimento de ${interactionModal.lead?.name}.`}
                </p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Comentário (Obrigatório)</label>
                  <textarea 
                    className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 outline-none resize-none text-sm"
                    placeholder="Descreva aqui o resultado do contato ou observação..."
                    value={interactionModal.comment}
                    onChange={e => setInteractionModal(prev => ({ ...prev, comment: e.target.value }))}
                  />
                </div>
                
                <div className="flex gap-2">
                   <button 
                    onClick={() => setInteractionModal({ open: false, comment: '', lead: null, type: 'note' })}
                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition"
                   >
                     Cancelar
                   </button>
                   <button 
                    onClick={recordInteraction}
                    disabled={!interactionModal.comment.trim()}
                    className={cn(
                      "flex-[2] py-3 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2",
                      interactionModal.type === 'whatsapp' ? "bg-green-600 hover:bg-green-700" : "bg-sesi-blue hover:bg-blue-800"
                    )}
                   >
                     <Send size={18} /> Salvar
                   </button>
                </div>
              </div>
            </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
