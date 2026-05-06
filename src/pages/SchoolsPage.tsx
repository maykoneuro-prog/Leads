import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { School as SchoolIcon, Edit2, Check, X, Search, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface School {
  id: string;
  name: string;
  city: string;
  whatsapp?: string;
  active: boolean;
  email?: string;
  offeredCourses?: string[];
}

interface Course {
  id: string;
  name: string;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', city: '', whatsapp: '', offeredCourses: [] as string[] });
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch schools
    const qSchools = query(collection(db, 'schools'));
    const unsubscribeSchools = onSnapshot(qSchools, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as School));
      setSchools(docs);
      setLoading(false);
    });

    // Fetch courses
    const qCourses = query(collection(db, 'courses'));
    const unsubscribeCourses = onSnapshot(qCourses, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setAvailableCourses(docs);
    });

    return () => {
      unsubscribeSchools();
      unsubscribeCourses();
    };
  }, []);

  const handleEdit = (school: School) => {
    setEditingId(school.id);
    setEditForm({ 
      name: school.name, 
      city: school.city, 
      whatsapp: school.whatsapp || '',
      offeredCourses: school.offeredCourses || [] 
    });
  };

  const toggleCourse = (courseId: string) => {
    setEditForm(prev => {
      const current = prev.offeredCourses;
      if (current.includes(courseId)) {
        return { ...prev, offeredCourses: current.filter(id => id !== courseId) };
      } else {
        return { ...prev, offeredCourses: [...current, courseId] };
      }
    });
  };

  const handleSave = async (id: string) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'schools', id), {
        name: editForm.name,
        city: editForm.city,
        whatsapp: editForm.whatsapp,
        offeredCourses: editForm.offeredCourses
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating school:', error);
      alert('Erro ao atualizar unidade');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.')) return;
    setUpdating(true);
    try {
      await deleteDoc(doc(db, 'schools', id));
    } catch (error) {
      console.error('Error deleting school:', error);
      alert('Erro ao excluir unidade');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Unidades</h1>
          <p className="text-slate-500 text-sm">Visualize e edite as informações das escolas SESI.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Unidade</th>
                <th className="px-6 py-4 font-semibold">Cidade / Níveis Ofertados</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-500 text-sm">Carregando unidades...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <p className="text-slate-500 text-sm">Nenhuma unidade encontrada.</p>
                  </td>
                </tr>
              ) : filtered.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 align-top">
                    {editingId === school.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <SchoolIcon size={16} />
                        </div>
                        <span className="font-medium text-slate-900">{school.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {editingId === school.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-2 text-sm"
                          placeholder="Cidade"
                        />
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">WhatsApp (apenas números)</label>
                          <input
                            type="text"
                            value={editForm.whatsapp}
                            onChange={(e) => setEditForm(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Ex: 81988887777"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {availableCourses.map(course => (
                            <label 
                              key={course.id} 
                              className={`flex items-center gap-2 px-2 py-1 rounded-md border cursor-pointer transition-all text-xs font-semibold ${
                                editForm.offeredCourses.includes(course.id)
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              <input 
                                type="checkbox"
                                className="hidden"
                                checked={editForm.offeredCourses.includes(course.id)}
                                onChange={() => toggleCourse(course.id)}
                              />
                              {course.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-slate-600 block">{school.city}</span>
                        <div className="flex flex-wrap gap-1">
                          {(school.offeredCourses || []).map(cid => (
                            <span key={cid} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                              {availableCourses.find(ac => ac.id === cid)?.name || cid}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === school.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSave(school.id)}
                          disabled={updating}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {updating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={updating}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(school)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Unidade"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(school.id)}
                          disabled={updating}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Excluir Unidade"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
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
