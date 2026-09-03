import api from './api';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Dashboard Interface
export interface SchoolAdminDashboard {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  pendingApplications: number;
  attendanceRate: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

// User Registration Interface
export interface RegisterUserData {
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'parent' | 'librarian' | 'storekeeper';
  grade?: string; // Required for students
  password?: string; // Optional, auto-generated if not provided
  staffProfile?: Record<string, any>;
  initialStatus?: string; // 'Approved' for enrollment accounts; omit for staff (defaults to Pending)
}

export interface RegisterUserResponse {
  data: {
    user: {
      id: string;
      digital_id: string;
      name: string;
      email: string;
      role: string;
      branch_id: string;
      status: string;
      staff_profile?: Record<string, any> | null;
    };
    temporaryPassword: string;
  };
}

// Course Interface
export interface Course {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName?: string;
  classId: string;
  className?: string;
}

export interface CreateCourseData {
  name: string;
  code: string;
  teacherId: string;
  classId: string;
}

// Schedule Interface
export interface Schedule {
  id: string;
  teacherId: string;
  teacherName?: string;
  day: string;
  timeSlot: string;
  className: string;
  subject: string;
}

export interface CreateScheduleData {
  teacherId: string;
  day: string;
  timeSlot: string;
  className: string;
  subject: string;
}

// Branch Academic Year Interface
export interface BranchAcademicYear {
  id: string;
  yearName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  branchId: string;
}

export interface CreateBranchAcademicYearData {
  yearName: string;
  startDate: string;
  endDate: string;
}

// Application Interface
export interface Application {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  grade: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate: string;
  documents?: string[];
}

export interface UpdateApplicationStatusData {
  status: string;
  gradeApplying?: string;
}

// Financial Policy Interface
export interface FinancialPolicy {
  id: string;
  gradeLevel: string;
  monthlyTuition: number;
  registrationFee: number;
  busFee: number;
  penaltyRate: number;
  academicYear: string;
  branchId: string;
}

export interface CreateFinancialPolicyData {
  gradeLevel: string;
  monthlyTuition: number;
  registrationFee: number;
  busFee: number;
  penaltyRate: number;
  academicYear: string;
}

// Dashboard
export const getDashboard = async (): Promise<SchoolAdminDashboard> => {
  const response = await api.get('/school-admin/dashboard');
  return response.data?.data ?? response.data;
};

// User Registration
export const registerUser = async (data: RegisterUserData, file?: File): Promise<RegisterUserResponse> => {
  if (file) {
    const formData = new FormData();
    formData.append('document', file);
    Object.keys(data).forEach((key) => {
      const value = (data as any)[key];
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    const response = await api.post('/school-admin/register-user', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } else {
    const response = await api.post('/school-admin/register-user', data);
    return response.data;
  }
};

export const replaceUserDocument = async (userId: string, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('document', file);
  const response = await api.post(`/school-admin/users/${userId}/document/replace`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Toggle Registration Open/Closed
export const toggleRegistration = async (open: boolean): Promise<void> => {
  const response = await api.post('/school-admin/system-settings/registration', { open });
  return response.data;
};

// Get Branch Users
export const getBranchUsers = async (role?: string, status?: string) => {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  const response = await api.get(`/school-admin/users?${params}`);
  return response.data;
};

// Courses
export const createCourse = async (data: CreateCourseData): Promise<Course> => {
  const response = await api.post('/school-admin/courses', data);
  return response.data;
};

export const getCourses = async (): Promise<Course[]> => {
  const response = await api.get('/school-admin/courses');
  return response.data;
};

// Schedules
export const createSchedule = async (data: CreateScheduleData): Promise<Schedule> => {
  const response = await api.post('/school-admin/schedules', data);
  return response.data;
};

export const getSchedules = async (): Promise<Schedule[]> => {
  const response = await api.get('/school-admin/schedules');
  return response.data;
};

// Applications
export const createPendingApplication = async (data: any) => {
  // Authenticated application submission for admin users
  const token = localStorage.getItem('ziquala_token');
  try {
    const response = await axios.post(`${API_BASE_URL}/school-admin/applications`, data, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error submitting application:', error.response?.data || error.message);
    throw error;
  }
};

export const getPendingApplications = async (): Promise<Application[]> => {
  const response = await api.get('/school-admin/applications');
  return response.data?.data || response.data || [];
};

export interface AdmissionDocument {
  id: string;
  type?: string;
  name?: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
  applicationId?: string;
  has_file?: boolean;
  source: string;
}

export interface StudentAdmissionRecord {
  student: {
    student_id: string;
    user_id: string;
    name: string;
    email: string;
    digital_id: string;
    grade: string;
    student_status: string | null;
    status: string;
    section_name: string | null;
    section_label: string | null;
    enrolled_at: string;
  };
  application: Record<string, any> | null;
  documents: AdmissionDocument[];
  hasApplication: boolean;
}

export const getStudentAdmissionRecord = async (studentId: string): Promise<StudentAdmissionRecord> => {
  const response = await api.get(`/school-admin/students/${studentId}/admission-record`);
  return response.data.data;
};

export const createPublicPendingApplication = async (data: any) => {
  // Public landing-page application submission without auth token
  try {
    const response = await axios.post(`${API_BASE_URL}/school-admin/public/applications`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error submitting public application:', error.response?.data || error.message);
    throw error;
  }
};

export const updateApplicationStatus = async (id: string, data: UpdateApplicationStatusData & { parentPhone?: string }) => {
  const response = await api.post(`/school-admin/applications/${id}/status`, data);
  return response.data;
};

export interface CompleteEnrollmentResult {
  student: {
    name: string;
    digitalId: string;
    username: string;
    pin: string;
    grade: string;
  };
  parent: {
    name: string;
    digitalId: string;
    username: string;
    pin: string | null;
    isExisting: boolean;
  };
  phone: string;
}

export const completeEnrollment = async (
  id: string,
  payload?: { parentDigitalId?: string; reference?: string }
): Promise<{ success: boolean; data: CompleteEnrollmentResult; message?: string }> => {
  const response = await api.post(`/school-admin/applications/${id}/complete-enrollment`, payload || {});
  return response.data;
};

// Financial Policies
export const createFinancialPolicy = async (data: CreateFinancialPolicyData): Promise<FinancialPolicy> => {
  const response = await api.post('/school-admin/financial-policies', data);
  return response.data;
};

export const getFinancialPolicies = async (): Promise<FinancialPolicy[]> => {
  const response = await api.get('/school-admin/financial-policies');
  return response.data;
};

// Get Branch Teachers
export const getBranchTeachers = async () => {
  const response = await api.get('/school-admin/teachers');
  return response.data;
};

// Teacher Management
export const approveTeacher = async (userId: string) => {
  const response = await api.post(`/school-admin/users/${userId}/status`, {
    status: 'Approved'
  });
  return response.data;
};

export const revokeTeacher = async (userId: string) => {
  const response = await api.post(`/school-admin/users/${userId}/status`, {
    status: 'Revoked'
  });
  return response.data;
};

export const deleteTeacher = async (userId: string) => {
  const response = await api.delete(`/school-admin/users/${userId}`);
  return response.data;
};

export const promoteTeacher = async (
  userId: string,
  data: {
    promotionType?: 'home-teacher' | 'before-school-educator' | 'head-of-department';
    roles?: string[];
    headOfDepartment?: {
      grades?: string[];
      subjects?: string[];
    };
    homeTeacher?: {
      grades?: string[];
      sections?: Record<string, string[]>;
    };
    subjects?: string[];
    grades?: string[];
    sections?: Record<string, string[]>;
    beforeSchool?: {
      days?: string[];
      startTime?: string;
      endTime?: string;
      useConfiguredRate?: boolean;
      extraPayAmount?: number;
    };
  }
) => {
  const response = await api.post(`/school-admin/users/${userId}/promote`, data);
  return response.data;
};

export const removeTeacherPromotion = async (userId: string) => {
  const response = await api.delete(`/school-admin/users/${userId}/promote`);
  return response.data;
};

// Student Management
export const updateUser = async (userId: string, data: { name?: string; email?: string; grade?: string; parentPhone?: string }) => {
  const response = await api.post(`/school-admin/users/${userId}`, data);
  return response.data;
};

export const resetUserPIN = async (userId: string) => {
  const response = await api.post(`/school-admin/users/${userId}/reset-pin`);
  return response.data.data;
};

export const assignStudentToClass = async (studentId: string, classId: string) => {
  const response = await api.post('/school-admin/students/assign-class', { studentId, classId });
  return response.data;
};

export const removeStudentFromClass = async (studentId: string) => {
  const response = await api.delete(`/school-admin/students/${studentId}/remove-class`);
  return response.data;
};

// At-Risk Students Interface
export interface AtRiskStudentCourse {
  course_id: string;
  course_name: string;
  course_code?: string;
  score: number;
  total: number;
  percentage: number;
  status: 'Passing' | 'Needs Improvement';
}

export interface AtRiskStudent {
  student_id: string;
  user_id: string;
  digital_id?: string;
  name: string;
  email?: string;
  grade: string;
  risk_level: 'High' | 'Medium' | 'Low';
  risk_factor: string;
  absence_count?: string | number;
  average_grade: string | number;
  courses?: AtRiskStudentCourse[];
  monthly_fee?: string;
  bus_fee?: string;
  penalty_fee?: string;
  fee_status?: 'standard' | 'reduced';
  created_at?: string;
}

export interface AtRiskStudentsResponse {
  students: AtRiskStudent[];
  summary: {
    high: number;
    medium: number;
  };
}

// Event Interface
export interface Event {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string | null;
  created_at: string;
}

export interface CreateEventData {
  title: string;
  date: string;
  type: string;
  description?: string;
}

export interface UpdateEventData {
  title?: string;
  date?: string;
  type?: string;
  description?: string;
}

// At-Risk Students
export const getAtRiskStudents = async (): Promise<AtRiskStudentsResponse> => {
  const response = await api.get('/school-admin/dashboard/at-risk-students');
  return response.data.data;
};

// Events
export const getUpcomingEvents = async (limit: number = 10): Promise<Event[]> => {
  const response = await api.get('/school-admin/dashboard/upcoming-events', {
    params: { limit }
  });
  return response.data.data;
};

export const createEvent = async (data: CreateEventData): Promise<Event> => {
  const response = await api.post('/school-admin/events', data);
  return response.data.data;
};

export const updateEvent = async (eventId: string, data: UpdateEventData): Promise<Event> => {
  const response = await api.post(`/school-admin/events/${eventId}`, data);
  return response.data.data;
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await api.delete(`/school-admin/events/${eventId}`);
};

// ============================================================
// SCHEDULE BUILDER
// ============================================================

export interface ScheduleConfig {
  id: string;
  branchId: string;
  academicYear: string;
  periodsPerDay: number;
  startTime: string;
  endTime: string;
  maxConsecutivePeriods: number;
  distributeSubjects: boolean;
}

export interface ScheduleConfigInput {
  periodsPerDay: number;
  startTime: string;
  endTime: string;
  maxConsecutivePeriods: number;
  distributeSubjects: boolean;
  academicYear?: string;
}

export interface TeacherConstraintInput {
  dayOfWeek: string;
  periodNumber: number;
}

export interface CourseFrequencyInput {
  courseId: string;
  sessionsPerWeek: number;
}

export interface ClassRecord {
  id: string;
  name: string;
  section?: string;
  capacity?: number;
}

export interface CreateClassData {
  name: string;
  capacity?: number;
  section?: string;
}

export interface StructureRowInput {
  classId: string;
  teacherId: string;
  subject: string;
  sessionsPerWeek: number;
}

export interface ScheduleCandidate {
  index: number;
  slotsFilled: number;
  totalSlots: number;
  fillRate: string;
  entries: Array<{
    teacherId: string;
    teacherName: string;
    day: string;
    period: number;
    timeSlot: string;
    classId: string;
    className: string;
    courseId: string;
    subject: string;
  }>;
}

export interface GenerateTimetableResult {
  runId: string;
  candidateCount: number;
  totalSlotsPossible: number;
  candidates: ScheduleCandidate[];
}

export interface TimetableRun {
  id: string;
  branch_id: string;
  academic_year: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_candidate: number | null;
  total_slots_filled: number;
  total_slots_possible: number;
  candidate_count: number;
  created_at: string;
}

// Schedule Config
export const saveScheduleConfig = async (config: ScheduleConfigInput): Promise<ScheduleConfig> => {
  const response = await api.put('/schedule/config', config);
  return response.data.data;
};

export const getScheduleConfig = async (academicYear?: string): Promise<ScheduleConfig | null> => {
  const params = academicYear ? { academicYear } : {};
  const response = await api.get('/schedule/config', { params });
  return response.data.data;
};

// Teacher Constraints
export const saveTeacherConstraints = async (
  teacherId: string, constraints: TeacherConstraintInput[], academicYear?: string
) => {
  const response = await api.put(`/schedule/teachers/${teacherId}/constraints`, {
    constraints, academicYear
  });
  return response.data.data;
};

export const getTeacherConstraintsApi = async (academicYear?: string) => {
  const params = academicYear ? { academicYear } : {};
  const response = await api.get('/schedule/teachers/constraints', { params });
  return response.data.data;
};

// Course Frequencies
export const saveCourseFrequencies = async (
  frequencies: CourseFrequencyInput[], academicYear?: string
) => {
  const response = await api.put('/schedule/courses/frequencies', {
    frequencies, academicYear
  });
  return response.data.data;
};

export const getCourseFrequencies = async (academicYear?: string) => {
  const params = academicYear ? { academicYear } : {};
  const response = await api.get('/schedule/courses/frequencies', { params });
  return response.data.data;
};

// Classes
export const getBranchClasses = async (): Promise<ClassRecord[]> => {
  const response = await api.get('/school-admin/classes');
  return response.data.data;
};

export const createBranchClass = async (data: CreateClassData): Promise<ClassRecord> => {
  const response = await api.post('/school-admin/classes', data);
  return response.data.data;
};

// Timetable Structure
export const saveScheduleStructure = async (
  structures: StructureRowInput[], academicYear?: string
) => {
  const response = await api.post('/schedule/structure', { structures, academicYear });
  return response.data.data;
};

export const getScheduleStructure = async (academicYear?: string) => {
  const params = academicYear ? { academicYear } : {};
  const response = await api.get('/schedule/structure', { params });
  return response.data.data;
};

// Timetable Generation
export const generateTimetable = async (academicYear?: string): Promise<GenerateTimetableResult> => {
  const response = await api.post('/schedule/generate', { academicYear });
  return response.data.data;
};

export const approveScheduleCandidate = async (runId: string, candidateIndex: number) => {
  const response = await api.post(`/schedule/runs/${runId}/approve`, { candidateIndex });
  return response.data.data;
};

// Query
export const getTimetableRuns = async (academicYear?: string): Promise<TimetableRun[]> => {
  const params = academicYear ? { academicYear } : {};
  const response = await api.get('/schedule/runs', { params });
  return response.data.data;
};

export const getTimetableRunDetail = async (runId: string) => {
  const response = await api.get(`/schedule/runs/${runId}`);
  return response.data.data;
};

export const getGeneratedSchedule = async () => {
  const response = await api.get('/schedule/timetable');
  return response.data.data;
};

// Grading Configurations
export const getGradingConfigs = async (): Promise<Record<string, Array<{ id: string; label: string; maxWeight: number }>>> => {
  const response = await api.get('/school-admin/grading-configs');
  return response.data.data;
};

export const publishGradingConfigs = async (
  gradeLevel: string,
  configs: Array<{ id: string; label: string; maxWeight: number }>
): Promise<any> => {
  const response = await api.post('/school-admin/grading-configs', { gradeLevel, configs });
  return response.data;
};

export const linkParentStudent = async (parentUserId: string, studentUserId: string): Promise<any> => {
  const response = await api.post('/school-admin/link-parent-student', { parentUserId, studentUserId });
  return response.data;
};
