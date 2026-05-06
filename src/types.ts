export enum UserRole {
  Admin = 'Admin',
  SchoolOperator = 'SchoolOperator',
  Viewer = 'Viewer',
}

export interface School {
  id: string;
  name: string;
  slug: string;
  city: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  offeredCourses?: string[];
}

export interface AppSettings {
  topBannerText?: string;
  showBanner?: boolean;
  bannerImageUrl?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  metric1Value?: string;
  metric1Label?: string;
  metric2Value?: string;
  metric2Label?: string;
  alertTitle?: string;
  alertDescription?: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  grades?: string[];
}

export interface SchoolOffer {
  id: string;
  schoolId: string;
  courseId: string; // e.g. "ensino-medio"
  grade: string;    // e.g. "1º Ano"
  slots: number;
  enrolledCount: number;
  active: boolean;
  updatedAt: any;
}

export interface LeadLog {
  userId: string;
  userName: string;
  action: string;
  comment?: string;
  timestamp: any;
}

export interface Lead {
  id: string;
  name: string;
  guardianName: string;
  email: string;
  phone: string;
  schoolId: string;
  courseId: string;
  grade: string;
  status: 'New' | 'Contacted' | 'Interested' | 'Enrolled' | 'Cancelled';
  createdAt: any;
  updatedAt: any;
  notes?: string;
  logs?: LeadLog[];
}

export interface UserRoleRecord {
  uid: string;
  name?: string;
  email: string;
  role: UserRole | 'Admin' | 'SchoolOperator' | 'Viewer';
  schoolId?: string;
}
