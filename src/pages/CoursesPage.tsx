import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, Plus, Trash2, Edit2, Check, X, Loader2, ListTree } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  grades?: string[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; grades: string }>({ name: '', grades: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditForm({ 
      name: course.name, 
      grades: (course.grades || []).join(', ') 
    });
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditForm({ name: '', grades: '' });
  };

  const saveCourse = async (id?: string) => {
    if (!editForm.name.trim()) return;
    setUpdating(true);
    
    const courseId = id || editForm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const grades = editForm.grades.split(',').map(g => g.trim()).filter(g => g !== '');
    
    try {
      await setDoc(doc(db, 'courses', courseId), {
        name: editForm.name,
        grades: grades
      }, { merge: true });
      
      setEditingId(null);
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Erro ao salvar nível de ensino');
    } finally {
      setUpdating(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este nível de ensino?')) return;
    setUpdating(true);
    try {
      await deleteDoc(doc(db, 'courses', id));
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Erro ao excluir nível de ensino');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nível de Ensino</h1>
          <p className="text-slate-500 text-sm">Gerencie os cursos e séries ofertados pela rede SESI.</p>
        </div>
        
        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2 bg-sesi-blue text-white rounded-lg hover:bg-sesi-blue/90 transition-all font-medium shadow-sm"
        >
          <Plus size={18} />
          Novo Nível
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdding && (
          <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-lg animate-in fade-in slide-in-from-top-4">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              Adicionar Novo Nível
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Nível</label>
                <input
                  type="text"
                  placeholder="Ex: Ensino Médio"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Séries / Anos (Separados por vírgula)</label>
                <textarea
                  placeholder="Ex: 1º Ano, 2º Ano, 3º Ano"
                  value={editForm.grades}
                  onChange={e => setEditForm(prev => ({ ...prev, grades: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveCourse()}
                  disabled={updating}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {updating && <Loader2 size={16} className="animate-spin" />}
                  Criar Nível
                </button>
              </div>
            </div>
          </div>
        )}

        {courses.map(course => (
          <div key={course.id} className={`bg-white rounded-xl border p-6 transition-all ${editingId === course.id ? 'border-blue-300 shadow-md ring-1 ring-blue-100' : 'border-slate-200 shadow-sm'}`}>
            {editingId === course.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Nível</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Séries / Anos</label>
                  <textarea
                    value={editForm.grades}
                    onChange={e => setEditForm(prev => ({ ...prev, grades: e.target.value }))}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => saveCourse(course.id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    <Check size={16} /> Salvar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-semibold"
                  >
                    <X size={16} /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{course.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{course.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(course)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteCourse(course.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {course.grades?.map((grade, idx) => (
                    <span key={idx} className="px-2 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded border border-slate-100 flex items-center gap-1">
                      <ListTree size={10} className="text-slate-400" />
                      {grade}
                    </span>
                  ))}
                  {(!course.grades || course.grades.length === 0) && (
                    <span className="text-xs text-slate-400 italic">Nenhuma série cadastrada</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="col-span-full py-12 text-center">
            <Loader2 className="animate-spin mx-auto text-slate-300 mb-4" size={32} />
            <p className="text-slate-500">Carregando níveis de ensino...</p>
          </div>
        )}
      </div>
    </div>
  );
}
