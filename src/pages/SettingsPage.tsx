import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { School, Course, AppSettings } from '../types';
import { School as SchoolIcon, BookOpen, Plus, Save, Trash2, MapPin, Phone, Megaphone, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SettingsPage() {
  const { roleData, loading: authLoading } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ topBannerText: '', showBanner: false });
  const [loading, setLoading] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (roleData?.role !== 'Admin') return;

    const fetchData = async () => {
      try {
        const [schoolSnap, courseSnap] = await Promise.all([
          getDocs(collection(db, 'schools')),
          getDocs(collection(db, 'courses'))
        ]);
        setSchools(schoolSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as School)));
        setCourses(courseSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Course)));
      } catch (err) {
        console.error("Error fetching settings data:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubSettings = onSnapshot(doc(db, 'settings', 'banner'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as AppSettings);
      }
    });

    fetchData();
    return () => unsubSettings();
  }, [authLoading, roleData]);

  const handleSaveBanner = async () => {
    setSavingBanner(true);
    try {
      await setDoc(doc(db, 'settings', 'banner'), {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/banner');
    } finally {
      setSavingBanner(false);
    }
  };

  if (authLoading) return <div className="p-8 flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Verificando autenticação...</div>;
  if (!roleData || roleData.role !== 'Admin') return <div className="p-8 text-center text-gray-500 italic">Apenas administradores podem acessar estas configurações.</div>;
  if (loading) return <div className="p-8 flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Carregando configurações...</div>;

  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Configurações Globais</h1>
        <p className="text-gray-500 font-sans">Gerencie os parâmetros do sistema e portal público</p>
      </header>

      {/* Banner Configuration */}
      <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Megaphone className="text-orange-500" /> Banner de Destaque (Topo)
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox"
              id="showBanner"
              className="w-5 h-5 rounded-md border-gray-300 text-orange-600 focus:ring-orange-500"
              checked={settings.showBanner}
              onChange={e => setSettings({...settings, showBanner: e.target.checked})}
            />
            <label htmlFor="showBanner" className="font-bold text-gray-700">Ativar banner no topo do portal</label>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Texto do Banner</label>
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none transition-all resize-none font-medium text-sm"
                rows={2}
                placeholder="Ex: MATRÍCULAS ABERTAS 2025 - VAGAS LIMITADAS!"
                value={settings.topBannerText}
                onChange={e => setSettings({...settings, topBannerText: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">URL da Imagem de Campanha (Banner)</label>
              <input 
                type="text"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none transition-all font-medium text-sm"
                placeholder="https://exemplo.com/imagem-campanha.jpg"
                value={settings.bannerImageUrl || ''}
                onChange={e => setSettings({...settings, bannerImageUrl: e.target.value})}
              />
              <p className="text-[10px] text-gray-400 italic">Dica: Recomendamos imagens horizontais de alta resolução (ex: 1920x400).</p>
            </div>
          </div>

          <button 
            onClick={handleSaveBanner}
            disabled={savingBanner}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {savingBanner ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Configuração
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <SchoolIcon className="text-blue-600" /> Unidades SESI PE
          </h2>
          <button className="flex items-center gap-2 text-sm text-blue-600 font-bold hover:underline">
            <Plus size={16} /> Adicionar Unidade
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {schools.map(school => (
            <motion.div 
              key={school.id}
              whileHover={{ scale: 1.01 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900">{school.name}</h3>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={12} /> {school.city}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
                  <Plus size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-orange-600" /> Níveis de Ensino
          </h2>
          <button className="flex items-center gap-2 text-sm text-orange-600 font-bold hover:underline">
            <Plus size={16} /> Novo Nível
          </button>
        </div>
        
        <div className="space-y-3">
          {courses.map(course => (
            <div key={course.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <p className="font-bold text-gray-700">{course.name}</p>
              <div className="flex gap-4">
                <button className="text-xs font-bold text-gray-400 hover:text-orange-600 uppercase tracking-widest">Editar</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
