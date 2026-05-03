import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { SchoolOffer, Course, School } from '../types';
import { Plus, Trash2, Edit2, Check, X, Loader2, BookOpen, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function SchoolOffersPage() {
  const { roleData, user } = useAuth();
  const [offers, setOffers] = useState<SchoolOffer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Form State
  const [newOffer, setNewOffer] = useState({
    schoolId: '',
    courseId: '',
    grade: '',
    slots: 20,
    active: true
  });

  useEffect(() => {
    if (!roleData) return;

    // Load Courses and Schools (for Admin)
    const loadBasics = async () => {
      const [coursesSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'schools'))
      ]);
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
      setSchools(schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() } as School)));
      
      // Default school if operator
      if (roleData.role === 'SchoolOperator' && roleData.schoolId) {
        setNewOffer(prev => ({ ...prev, schoolId: roleData.schoolId! }));
      }
    };
    loadBasics();

    // Subscribe to Offers
    let q = query(collection(db, 'schoolOffers'));
    if (roleData.role === 'SchoolOperator' && roleData.schoolId) {
      q = query(collection(db, 'schoolOffers'), where('schoolId', '==', roleData.schoolId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOffers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolOffer)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'schoolOffers');
    });

    return () => unsubscribe();
  }, [roleData]);

  const handleAddOffer = async () => {
    if (!newOffer.schoolId || !newOffer.courseId || !newOffer.grade) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const id = `${newOffer.schoolId}_${newOffer.courseId}_${newOffer.grade.replace(/\s+/g, '-')}`;
    setUpdating('adding');
    
    try {
      await setDoc(doc(db, 'schoolOffers', id), {
        ...newOffer,
        enrolledCount: 0,
        updatedAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewOffer({ ...newOffer, courseId: '', grade: '', slots: 20 });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schoolOffers/${id}`);
    } finally {
      setUpdating(null);
    }
  };

  const toggleStatus = async (offer: SchoolOffer) => {
    setUpdating(offer.id);
    try {
      await setDoc(doc(db, 'schoolOffers', offer.id), {
        active: !offer.active,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schoolOffers/${offer.id}`);
    } finally {
      setUpdating(null);
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm('Excluir esta oferta de vagas?')) return;
    setUpdating(id);
    try {
      await deleteDoc(doc(db, 'schoolOffers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schoolOffers/${id}`);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse">Carregando painel de vagas...</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Vagas por Escola</h1>
          <p className="text-slate-500 text-sm">Controle a oferta educacional da sua unidade.</p>
        </div>
        
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sesi-blue text-white rounded-lg hover:bg-sesi-blue/90 transition-all font-medium"
        >
          <Plus size={18} />
          Nova Oferta
        </button>
      </header>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {roleData?.role === 'Admin' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Escola</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm"
                  value={newOffer.schoolId}
                  onChange={e => setNewOffer({...newOffer, schoolId: e.target.value})}
                >
                  <option value="">Selecionar...</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nível de Ensino</label>
              <select 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm"
                value={newOffer.courseId}
                onChange={e => setNewOffer({...newOffer, courseId: e.target.value, grade: ''})}
              >
                <option value="">Selecionar...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Série / Ano</label>
              <select 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm"
                value={newOffer.grade}
                onChange={e => setNewOffer({...newOffer, grade: e.target.value})}
                disabled={!newOffer.courseId}
              >
                <option value="">Selecionar...</option>
                {courses.find(c => c.id === newOffer.courseId)?.grades?.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total de Vagas</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm"
                  value={newOffer.slots}
                  onChange={e => setNewOffer({...newOffer, slots: parseInt(e.target.value)})}
                />
                <button
                  onClick={handleAddOffer}
                  disabled={updating === 'adding'}
                  className="flex-1 bg-sesi-blue text-white rounded-lg font-bold text-sm hover:bg-sesi-blue/90 disabled:opacity-50"
                >
                  {updating === 'adding' ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar'}
                </button>
                <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {offers.map(offer => {
          const course = courses.find(c => c.id === offer.courseId);
          const school = schools.find(s => s.id === offer.schoolId);
          const available = offer.slots - offer.enrolledCount;
          
          return (
            <div key={offer.id} className={cn(
              "bg-white p-5 rounded-xl border transition-all relative overflow-hidden group",
              offer.active ? "border-slate-200 shadow-sm" : "border-slate-200 opacity-60 grayscale bg-slate-50"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    offer.active ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                  )}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{course?.name || offer.courseId}</h3>
                    <p className="text-xs text-slate-500">{offer.grade}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => deleteOffer(offer.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {roleData?.role === 'Admin' && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-4">
                  {school?.name || offer.schoolId}
                </p>
              )}

              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ocupação de Vagas</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-800">{offer.enrolledCount}</span>
                      <span className="text-sm text-slate-400 font-bold">/ {offer.slots}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleStatus(offer)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      offer.active 
                        ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100" 
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                    )}
                  >
                    {offer.active ? <Check size={14} /> : <AlertCircle size={14} />}
                    {offer.active ? 'Oferta Ativa' : 'Pausada'}
                    {updating === offer.id && <Loader2 size={12} className="animate-spin" />}
                  </button>
                </div>

                <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (offer.enrolledCount / offer.slots) * 100)}%` }}
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                      (offer.enrolledCount / offer.slots) >= 0.8 ? "bg-red-500" : "bg-blue-600"
                    )}
                  />
                </div>
                
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-tight italic">
                  {available <= 0 ? '❌ Vagas Esgotadas' : `✅ ${available} vagas restantes`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {offers.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-slate-600 font-bold">Inicie sua oferta educacional</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">Clique no botão "Nova Oferta" para disponibilizar vagas e séries na sua unidade.</p>
        </div>
      )}
    </div>
  );
}
