import { School, Course } from './types';

export const INITIAL_SCHOOLS: Omit<School, 'id'>[] = [
  { name: 'SESI Ibura', slug: 'sesi-ibura', city: 'Recife' },
  { name: 'SESI Cabo', slug: 'sesi-cabo', city: 'Cabo de Santo Agostinho' },
  { name: 'SESI Camaragibe', slug: 'sesi-camaragibe', city: 'Camaragibe' },
  { name: 'SESI Jaboatão', slug: 'sesi-jaboatao', city: 'Jaboatão dos Guararapes' },
  { name: 'SESI Paulista', slug: 'sesi-paulista', city: 'Paulista' },
  { name: 'SESI Goiana', slug: 'sesi-goiana', city: 'Goiana' },
  { name: 'SESI Moreno', slug: 'sesi-moreno', city: 'Moreno' },
  { name: 'SESI Caruaru', slug: 'sesi-caruaru', city: 'Caruaru' },
  { name: 'SESI Garanhuns', slug: 'sesi-garanhuns', city: 'Garanhuns' },
  { name: 'SESI Petrolina', slug: 'sesi-petrolina', city: 'Petrolina' },
  { name: 'SESI Araripina', slug: 'sesi-araripina', city: 'Araripina' },
  { name: 'SESI Belo Jardim', slug: 'sesi-belojardim', city: 'Belo Jardim' },
];

export const INITIAL_COURSES: Omit<Course, 'id'>[] = [
  { name: 'Educação Infantil' },
  { name: 'Ensino Fundamental I' },
  { name: 'Ensino Fundamental II' },
  { name: 'Ensino Médio' },
  { name: 'EJA - Educação para Jovens e Adultos' },
];

export const GRADES_BY_COURSE: Record<string, string[]> = {
  'Educação Infantil': ['Grupo 3', 'Grupo 4', 'Grupo 5'],
  'Ensino Fundamental I': ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'],
  'Ensino Fundamental II': ['6º Ano', '7º Ano', '8º Ano', '9º Ano'],
  'Ensino Médio': ['1ª Série', '2ª Série', '3ª Série'],
  'EJA - Educação para Jovens e Adultos': ['Fase I', 'Fase II', 'Fase III', 'Fase IV'],
};
