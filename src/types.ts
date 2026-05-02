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
  email?: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
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
}

export interface UserRoleRecord {
  uid: string;
  email: string;
  role: UserRole;
  schoolId?: string;
}
