import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, increment, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { School, Course, SchoolOffer } from '../types';
import { motion } from 'motion/react';
import { CheckCircle, School as SchoolIcon, GraduationCap, Phone, Mail, User, Info, AlertCircle } from 'lucide-react';

export default function LandingPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [offers, setOffers] = useState<SchoolOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

    return () => {
      unsubSchools();
      unsubCourses();
      unsubOffers();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the offer to check vacancy one last time
    const offer = offers.find(o => 
      o.schoolId === formData.schoolId && 
      o.courseId === formData.courseId && 
      o.grade === formData.grade
    );

    if (!offer) {
      alert('Esta oferta não está mais disponível.');
      return;
    }

    if (offer.slots - offer.enrolledCount <= 0) {
      alert('Desculpe, as vagas para esta turma acabaram de ser preenchidas.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Lead
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

      // 2. Increment enrolledCount in offer
      await updateDoc(doc(db, 'schoolOffers', offer.id), {
        enrolledCount: increment(1),
        updatedAt: serverTimestamp()
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar cadastro. Tente novamente.');
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
    <div className="min-h-screen bg-slate-50 overflow-x-hidden font-sans">
      {/* Hero Section */}
      <header className="bg-sesi-blue py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center font-black text-sesi-blue text-3xl shadow-xl border-4 border-white/20"
          >
            S
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tight"
          >
            Invista no futuro do seu filho
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto font-medium"
          >
            Faça parte da rede de ensino que conecta educação, tecnologia e inovação em todo Pernambuco.
          </motion.p>
        </div>
      </header>

      {/* Form Section */}
      <main className="max-w-4xl mx-auto -mt-12 px-4 pb-24 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,76,145,0.1)] p-8 md:p-12 border border-slate-100"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-slate-50 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Cadastro de Interesse</h2>
              <p className="text-slate-500 text-sm">Preencha os dados abaixo para receber atendimento exclusivo</p>
            </div>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-slate-200" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-sesi-blue flex items-center justify-center text-[10px] font-bold text-white">
                +12k
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> Dados Pessoais
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nome Completo do Aluno</label>
                  <input 
                    required
                    type="text"
                    placeholder="João Silva"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all placeholder:text-slate-300"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nome do Responsável</label>
                  <input 
                    required
                    type="text"
                    placeholder="Nome Completo"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all placeholder:text-slate-300"
                    value={formData.guardianName}
                    onChange={e => setFormData({...formData, guardianName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">E-mail para contato</label>
                  <input 
                    required
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all placeholder:text-slate-300"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Telefone / WhatsApp</label>
                  <input 
                    required
                    type="tel"
                    placeholder="(81) 90000-0000"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all placeholder:text-slate-300"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <SchoolIcon size={14} /> Preferências Educacionais
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Unidade SESI de Interesse</label>
                  <select 
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all appearance-none cursor-pointer"
                    value={formData.schoolId}
                    onChange={e => setFormData({...formData, schoolId: e.target.value, courseId: '', grade: ''})}
                  >
                    <option value="">Selecione uma unidade...</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>{school.name} ({school.city})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nível e Série</label>
                    <div className="flex flex-col gap-3">
                      <select 
                        required
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all appearance-none cursor-pointer"
                        value={formData.courseId}
                        onChange={e => setFormData({...formData, courseId: e.target.value, grade: ''})}
                        disabled={!formData.schoolId}
                      >
                        <option value="">{formData.schoolId ? 'Selecione o nível de ensino' : 'Selecione a unidade primeiro'}</option>
                        {courses
                          .filter(course => availableCourseIds.includes(course.id))
                          .map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                          ))
                        }
                      </select>
                      
                        {formData.courseId && (
                        <motion.select 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          required
                          className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sesi-blue/5 focus:border-sesi-blue outline-none transition-all appearance-none cursor-pointer"
                          value={formData.grade}
                          onChange={e => setFormData({...formData, grade: e.target.value})}
                        >
                          <option value="">Selecione a Série...</option>
                          {availableGrades.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </motion.select>
                      )}
                      
                      {formData.schoolId && availableCourseIds.length === 0 && !loading && (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-100">
                          <AlertCircle size={14} />
                          Esta unidade não possui vagas disponíveis no momento.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-10">
              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-orange-600 text-white text-xl font-black rounded-2xl hover:bg-orange-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_rgba(234,88,12,0.2)]"
              >
                {submitting ? 'PROCESSANDO...' : 'CADASTRAR INTERESSE AGORA'}
              </button>
              <div className="flex items-start gap-3 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Seus dados estão seguros conosco. Ao clicar em "Cadastrar Interesse", você concorda com os Termos de Uso e Política de Privacidade do SESI PE, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>
            </div>
          </form>
        </motion.div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <div className="font-black text-slate-300 text-xl tracking-tighter uppercase">SESI Pernambuco</div>
          <p className="text-slate-400 text-xs font-medium">Polo Educacional e Tecnológico • Todos os direitos reservados &copy; {new Date().getFullYear()}</p>
          <div className="pt-4">
            <a href="/login" className="text-[10px] font-bold text-slate-300 hover:text-sesi-blue transition-colors uppercase tracking-widest border border-slate-100 px-3 py-1 rounded-full">
              Acesso Administrativo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
