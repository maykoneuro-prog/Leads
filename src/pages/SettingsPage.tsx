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
        </div>
      </section>

      {/* Landing Page Content Customization */}
      <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="text-blue-600" /> Conteúdo da Landing Page
        </h2>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Título Principal (Headline)</label>
              <input 
                type="text"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                placeholder="Ex: Invista no futuro do seu filho"
                value={settings.heroHeadline || ''}
                onChange={e => setSettings({...settings, heroHeadline: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Subtítulo</label>
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all resize-none font-medium text-sm"
                rows={3}
                placeholder="Descrição curta do SESI PE"
                value={settings.heroSubheadline || ''}
                onChange={e => setSettings({...settings, heroSubheadline: e.target.value})}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Título do Formulário</label>
              <input 
                type="text"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                placeholder="Ex: Matrícula 2025"
                value={settings.formTitle || ''}
                onChange={e => setSettings({...settings, formTitle: e.target.value})}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Métrica 1 (Valor)</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                placeholder="+12k"
                value={settings.metric1Value || ''}
                onChange={e => setSettings({...settings, metric1Value: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Métrica 1 (Título)</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                placeholder="Alunos"
                value={settings.metric1Label || ''}
                onChange={e => setSettings({...settings, metric1Label: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Métrica 2 (Valor)</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                placeholder="100%"
                value={settings.metric2Value || ''}
                onChange={e => setSettings({...settings, metric2Value: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Métrica 2 (Título)</label>
              <input 
                type="text"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                placeholder="Inovação"
                value={settings.metric2Label || ''}
                onChange={e => setSettings({...settings, metric2Label: e.target.value})}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-2">
              <label className="text-sm font-bold text-orange-600">Título do Alerta</label>
              <input 
                type="text"
                className="w-full p-4 bg-white border border-orange-100 rounded-2xl outline-none focus:border-orange-500 font-bold text-sm"
                placeholder="VAGAS LIMITADAS"
                value={settings.alertTitle || ''}
                onChange={e => setSettings({...settings, alertTitle: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-orange-600">Descrição do Alerta</label>
              <input 
                type="text"
                className="w-full p-4 bg-white border border-orange-100 rounded-2xl outline-none focus:border-orange-500 text-sm"
                placeholder="Garanta sua vaga..."
                value={settings.alertDescription || ''}
                onChange={e => setSettings({...settings, alertDescription: e.target.value})}
              />
            </div>
          </div>

          <button 
            onClick={handleSaveBanner}
            disabled={savingBanner}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            {savingBanner ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} 
            SALVAR TODAS AS ALTERAÇÕES DO PORTAL
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
