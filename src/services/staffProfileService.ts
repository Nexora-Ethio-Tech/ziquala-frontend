import api from './api';

export interface StaffProfileDetails {
  user: { id: string; name: string; email: string; role: string; status: string; staff_profile: Record<string, any> };
  teacherId: string | null;
  classes: Array<{ id: string; name: string; section: string; teacher_id: string | null }>;
  courses: Array<{ id: string; name: string; class_name: string; section: string; teacher_id: string | null }>;
}
export interface StaffProfileUpdate {
  name: string;
  email: string;
  status: string;
  role?: string;
  staffProfile: {
    gender: string; phoneNumber: string; title: string; department: string;
    dob?: string; age?: number | null; educationLevel?: string; specialty?: string;
    previousSchool?: string; experienceYears?: number | null;
    emergencyContactName?: string; emergencyContactPhone?: string;
  };
  assignedClassIds?: string[];
  assignedCourseIds?: string[];
}
export async function getStaffProfile(userId: string): Promise<StaffProfileDetails> {
  return (await api.get(`/school-admin/users/${userId}/staff-profile`)).data.data;
}
export async function saveStaffProfile(userId: string, data: StaffProfileUpdate): Promise<StaffProfileDetails['user']> {
  return (await api.patch(`/school-admin/users/${userId}/staff-profile`, data)).data.data;
}
