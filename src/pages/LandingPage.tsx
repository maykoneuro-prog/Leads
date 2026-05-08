import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, increment, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { School, Course, SchoolOffer, AppSettings } from '../types';
import { motion } from 'motion/react';
import { CheckCircle, School as SchoolIcon, GraduationCap, Phone, Mail, User, Info, AlertCircle, XCircle, MessageCircle } from 'lucide-react';

export default function LandingPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [offers, setOffers] = useState<SchoolOffer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Math CAPTCHA State
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, userAnswer: '' });

  const generateCaptcha = () => {
    setCaptcha({
      num1: Math.floor(Math.random() * 10) + 1,
      num2: Math.floor(Math.random() * 10) + 1,
      userAnswer: ''
    });
  };

  const [formData, setFormData] = useState({
    name: '',
    guardianName: '',
    email: '',
    phone: '',
    schoolId: '',
    courseId: '',
    grade: '',
  });

  useEffect(() => {
    // Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'banner'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    });

    // Schools
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schools'));

    // Courses
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

    // Active Offers
    const qOffers = query(collection(db, 'schoolOffers'), where('active', '==', true));
    const unsubOffers = onSnapshot(qOffers, (snap) => {
      setOffers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolOffer)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schoolOffers'));

    generateCaptcha();

    return () => {
      unsubSettings();
      unsubSchools();
      unsubCourses();
      unsubOffers();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate CAPTCHA
    if (parseInt(captcha.userAnswer) !== captcha.num1 + captcha.num2) {
      setError('O resultado da soma está incorreto. Tente novamente.');
      generateCaptcha();
      return;
    }
    
    // 2. Find the offer to check vacancy
    const offer = offers.find(o => 
      o.schoolId === formData.schoolId && 
      o.courseId === formData.courseId && 
      o.grade === formData.grade
    );

    if (!offer) {
      setError('Esta oferta não está mais disponível.');
      return;
    }

    if (offer.slots - offer.enrolledCount <= 0) {
      setError('Desculpe, as vagas para esta turma acabaram de ser preenchidas.');
      return;
    }

    setSubmitting(true);
    try {
      // 3. Duplicate check (Phone/WhatsApp)
      const phoneClean = formData.phone.replace(/\D/g, '');
      const phoneRef = doc(db, 'leadPhones', phoneClean);
      const phoneSnap = await getDoc(phoneRef);
      
      if (phoneSnap.exists()) {
        setError('Este número de telefone/WhatsApp já possui um cadastro de interesse ativo.');
        setSubmitting(false);
        return;
      }

      // 4. Create Lead
      await addDoc(collection(db, 'leads'), {
        ...formData,
        status: 'New',
        logs: [{
          userName: 'Sistema',
          action: 'Cadastro realizado pelo portal público',
          timestamp: new Date()
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 5. Register phone to prevent duplicates
      await setDoc(phoneRef, {
        registeredAt: serverTimestamp(),
        email: formData.email
      });

      // 6. Increment enrolledCount in offer
      await updateDoc(doc(db, 'schoolOffers', offer.id), {
        enrolledCount: increment(1),
        updatedAt: serverTimestamp()
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, 'leads');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans font-bold text-sesi-blue animate-pulse">Carregando portal SESI...</div>;

  // Filter logic
  const availableOffersForSchool = offers.filter(o => 
    o.schoolId === formData.schoolId && 
    (o.slots - o.enrolledCount > 0)
  );

  const availableCourseIds = Array.from(new Set(availableOffersForSchool.map(o => o.courseId)));
  const availableGrades = Array.from(new Set(availableOffersForSchool
    .filter(o => o.courseId === formData.courseId)
    .map(o => o.grade)
  ));

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4"
        >
          <div className="bg-green-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600 w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Interesse Registrado!</h2>
          <p className="text-gray-600">
            Agradecemos o seu interesse no SESI Pernambuco. Logo entraremos em contato para fornecer mais informações sobre o processo de matrícula.
          </p>
          <button 
            onClick={() => { setSuccess(false); setFormData({ ...formData, name: '', email: '', phone: '' }); }}
            className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
          >
            Novo Cadastro
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans selection:bg-sesi-blue selection:text-white">
      <main className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-16">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.5fr_1fr] gap-12 lg:gap-16 items-start">
          
          {/* Main Content Area (60% Desktop) */}
          <div className="space-y-10 lg:space-y-12 w-full order-1">
            
            {/* Headline and Subheadline - Priority for Mobile and Desktop visibility */}
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-16 h-16 bg-sesi-blue rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-sesi-blue/20"
              >
                S
              </motion.div>
              
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[0.95] tracking-tighter"
                >
                  {settings?.heroHeadline?.includes('futuro') ? (
                    <>
                      {settings.heroHeadline.split('futuro')[0]}
                      <span className="text-sesi-blue">futuro</span>
                      {settings.heroHeadline.split('futuro')[1]}
                    </>
                  ) : (
                    settings?.heroHeadline || (
                      <>Invista no <span className="text-sesi-blue">futuro</span> do seu filho</>
                    )
                  )}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed max-w-xl"
                >
                  {settings?.heroSubheadline || 'Educação de excelência com tecnologia e inovação para preparar os líderes de amanhã. Faça parte da família SESI Pernambuco.'}
                </motion.p>
              </div>
            </div>

            {/* Banner Image in Left Column - Compact & Horizontal */}
            {settings?.showBanner && settings.bannerImageUrl && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-auto overflow-hidden rounded-[2rem] shadow-2xl shadow-sesi-blue/5 bg-slate-100 order-2 lg:order-none"
              >
                <img 
                  src={settings.bannerImageUrl} 
                  alt="Campanha SESI PE" 
                  className="w-full h-auto object-cover aspect-[21/9] max-h-[350px]"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}

            {/* Top Banner Text as fallback if no image */}
            {settings?.showBanner && !settings.bannerImageUrl && settings.topBannerText && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-500 text-white p-8 rounded-[2rem] font-black text-2xl uppercase tracking-tight shadow-xl shadow-orange-500/10 order-2 lg:order-none"
              >
                {settings.topBannerText}
              </motion.div>
            )}

            {/* Social Proof & Alerts Area */}
            <div className="space-y-8 order-4 lg:order-none">
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-center">
                  <div className="text-4xl font-black text-sesi-blue mb-1">{settings?.metric1Value || '+12k'}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{settings?.metric1Label || 'Alunos Ativos'}</div>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <div className="text-4xl font-black text-orange-500 mb-1">{settings?.metric2Value || '100%'}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{settings?.metric2Label || 'Inovação e Tecnologia'}</div>
                </div>
              </div>

              <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center gap-5">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-sesi-blue shadow-sm shrink-0">
                  <Info size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-blue-900 leading-tight">{settings?.alertTitle || 'VAGAS LIMITADAS PARA 2025'}</p>
                  <p className="text-xs font-bold text-blue-700/70 mt-0.5">{settings?.alertDescription || 'Garanta sua reserva em uma de nossas 12 unidades.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Registration Form (40% Desktop) - Order 3 on mobile */}
          <div className="w-full order-3 lg:sticky lg:top-12">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(0,76,145,0.12)] p-8 md:p-10 border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <SchoolIcon size={120} />
              </div>

              <div className="space-y-2 mb-10">
                <div className="inline-flex px-3 py-1 bg-sesi-blue/5 text-sesi-blue rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                  Leva menos de 1 minuto
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                  {settings?.formTitle || 'Matrícula 2025'}
                </h2>
                <p className="text-slate-500 font-medium">Preencha e entraremos em contato</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Aluno(a)</label>
                      <input 
                        required
                        type="text"
                        placeholder="Nome completo"
                        className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sesi-blue focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium text-sm"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Responsável</label>
                      <input 
                        required
                        type="text"
                        placeholder="Nome completo"
                        className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sesi-blue focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium text-sm"
                        value={formData.guardianName}
                        onChange={e => setFormData({...formData, guardianName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">E-mail</label>
                      <input 
                        required
                        type="email"
                        placeholder="email@exemplo.com"
                        className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sesi-blue focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium text-sm"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">WhatsApp</label>
                      <input 
                        required
                        type="tel"
                        placeholder="(81) 00000-0000"
                        className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sesi-blue focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium text-sm"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Unidade</label>
                        <select 
                          required
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sesi-blue focus:bg-white outline-none transition-all appearance-none cursor-pointer font-bold text-slate-700 text-sm"
                          value={formData.schoolId}
                          onChange={e => setFormData({...formData, schoolId: e.target.value, courseId: '', grade: ''})}
                        >
                          <option value="">Selecione...</option>
                          {schools.map(school => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Ensino</label>
                        <select 
                          required
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sesi-blue focus:bg-white outline-none transition-all appearance-none cursor-pointer font-bold text-slate-700 text-sm disabled:opacity-40"
                          value={formData.courseId}
                          onChange={e => setFormData({...formData, courseId: e.target.value, grade: ''})}
                          disabled={!formData.schoolId}
                        >
                          <option value="">Nível</option>
                          {courses
                            .filter(course => availableCourseIds.includes(course.id))
                            .map(course => (
                              <option key={course.id} value={course.id}>{course.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Série</label>
                        <select 
                          required
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-sesi-blue outline-none transition-all appearance-none cursor-pointer font-bold text-slate-700 text-sm disabled:opacity-40"
                          value={formData.grade}
                          onChange={e => setFormData({...formData, grade: e.target.value})}
                          disabled={!formData.courseId}
                        >
                          <option value="">Selecionar</option>
                          {availableGrades.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Discrete Security Validation */}
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-tighter shrink-0">
                          {captcha.num1}+{captcha.num2}=
                        </div>
                        <input 
                          required
                          type="number"
                          placeholder="?"
                          className="w-full bg-white border border-slate-200 rounded-lg focus:border-sesi-blue outline-none transition-all font-black text-center text-sm p-1.5"
                          value={captcha.userAnswer}
                          onChange={e => setCaptcha({...captcha, userAnswer: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-[11px] font-bold flex items-center gap-2"
                  >
                    <XCircle size={14} />
                    {error}
                  </motion.div>
                )}

                <div className="pt-4 space-y-4">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full py-5 bg-sesi-blue text-white text-lg font-black rounded-2xl hover:bg-blue-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_20px_40px_-10px_rgba(0,76,145,0.3)] uppercase tracking-tighter"
                  >
                    {submitting ? 'PROCESSANDO...' : 'CADASTRAR INTERESSE'}
                  </button>
                  <p className="text-[10px] text-slate-400 leading-tight text-center px-4 font-medium uppercase tracking-tight">
                    Ao cadastrar, você autoriza o SESI PE a entrar em contato. Seus dados estão protegidos pela LGPD.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </main>


      {/* Schools Contact Section */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Fale Conosco</h2>
          <p className="text-slate-500 font-medium text-lg">Selecione uma unidade para conversar diretamente via WhatsApp</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {schools.filter(s => s.whatsapp).map(school => (
            <a 
              key={school.id}
              href={`https://wa.me/55${school.whatsapp!.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between p-6 bg-white border border-slate-200 rounded-3xl hover:border-sesi-blue hover:shadow-xl hover:shadow-sesi-blue/5 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:bg-sesi-blue group-hover:text-white transition-colors">
                  <MessageCircle size={24} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-sesi-blue transition-colors">{school.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{school.city}</div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-green-50 group-hover:text-green-600 group-hover:border-green-100 transition-all">
                →
              </div>
            </a>
          ))}
        </div>
      </section>

      <footer className="bg-white border-t border-slate-100 py-16 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="font-black text-slate-200 text-3xl tracking-tighter uppercase opacity-50">SESI Pernambuco</div>
          <p className="text-slate-400 text-sm font-medium">Polo Educacional e Tecnológico • Todos os direitos reservados &copy; {new Date().getFullYear()}</p>
          <div className="pt-6">
            <a href="/login" className="text-[10px] font-black text-slate-400 hover:text-sesi-blue transition-colors uppercase tracking-widest border border-slate-200 px-6 py-2 rounded-full hover:bg-slate-50">
              Acesso Administrativo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

