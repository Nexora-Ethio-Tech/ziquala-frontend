import api from './api';

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getTeacherDashboard = async () => {
  const response = await api.get('/teacher/dashboard');
  return response.data.data;
};

// ─── Schedule ─────────────────────────────────────────────────────────────────
export const getTeacherSchedule = async () => {
  const response = await api.get('/teacher/schedule');
  return response.data.data;
};

// ─── Announcements ────────────────────────────────────────────────────────────
export const getSchoolAnnouncements = async () => {
  const response = await api.get('/teacher/announcements');
  return response.data.data;
};

// ─── Classes ──────────────────────────────────────────────────────────────────
export const getMyClasses = async (purpose?: 'grades' | 'attendance') => {
  const params = purpose ? `?purpose=${purpose}` : '';
  const response = await api.get(`/teacher/classes${params}`);
  return response.data.data;
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const getClassStudents = async (classId: string) => {
  const response = await api.get(`/teacher/students/${classId}`);
  return response.data.data;
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const markAttendance = async (data: {
  date: string;
  attendanceRecords: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'excused';
  }>;
}) => {
  const response = await api.post('/teacher/attendance', data);
  return response.data;
};

export const getClassAttendance = async (classId: string, date?: string) => {
  const params = date ? `?date=${date}` : '';
  const response = await api.get(`/teacher/attendance/${classId}${params}`);
  return response.data.data;
};

// ─── Grades ───────────────────────────────────────────────────────────────────
// Create single grade
export const enterGrade = async (data: {
  studentId: string;
  courseId: string;
  type: string;
  score: number;
  total: number;
  weight?: string;
}) => {
  const response = await api.post('/teacher/grades', data);
  return response.data;
};

// Bulk create grades
export const bulkEnterGrades = async (data: {
  courseId: string;
  academicYear?: string;
  semester?: number;
  grades: Array<{
    studentId: string;
    type: string;
    score: number;
    total: number;
    weight?: string;
  }>;
}) => {
  const response = await api.post('/teacher/grades/bulk', data);
  return response.data;
};

// Get grades by course
export const getCourseGrades = async (courseId: string) => {
  const response = await api.get(`/teacher/grades/${courseId}`);
  return response.data.data;
};

// Update grade
export const updateGrade = async (gradeId: string, data: {
  score?: number;
  total?: number;
  type?: string;
  weight?: string;
}) => {
  const response = await api.post(`/teacher/grades/${gradeId}`, data);
  return response.data;
};

// Delete grade
export const deleteGrade = async (gradeId: string) => {
  const response = await api.delete(`/teacher/grades/${gradeId}`);
  return response.data;
};

// View student's all grades (across all courses)
export const getStudentAllGrades = async (studentId: string) => {
  const response = await api.get(`/teacher/students/${studentId}/grades`);
  return response.data.data;
};

// Get grading config for a grade level
export const getGradingConfigsForGrade = async (gradeLevel: string): Promise<Array<{ id: string; label: string; maxWeight: number }>> => {
  const response = await api.get(`/grading-configs/${encodeURIComponent(gradeLevel)}`);
  return response.data.data;
};

// ─── Weekly Plans ─────────────────────────────────────────────────────────────
export const submitWeeklyPlan = async (data: {
  date: string;
  content: string;
  objectives: string;
  teacherActivity: string;
  timeDuration: string;
  studentActivity: string;
  teachingMethod: string;
  teachingAids: string;
  evaluation: string;
  remark?: string;
  status?: 'Draft' | 'Pending';
}) => {
  const response = await api.post('/teacher/weekly-plans', data);
  return response.data;
};

export const getMyWeeklyPlans = async (status?: string) => {
  const params = status ? `?status=${status}` : '';
  const response = await api.get(`/teacher/weekly-plans${params}`);
  return response.data.data;
};

export const updateWeeklyPlan = async (planId: string, data: {
  date?: string;
  content?: string;
  objectives?: string;
  teacherActivity?: string;
  timeDuration?: string;
  studentActivity?: string;
  teachingMethod?: string;
  teachingAids?: string;
  evaluation?: string;
  remark?: string;
  status?: 'Draft' | 'Pending';
  courseId?: string;
  subject?: string;
  deptHeadId?: string;
  weekNumber?: number;
}) => {
  const response = await api.post(`/teacher/weekly-plans/${planId}`, data);
  return response.data;
};

// ─── Communication Logs ───────────────────────────────────────────────────────
export const submitCommunicationLog = async (data: {
  studentId: string;
  weekEnding: string;
  ratingUniform: number;
  ratingMaterials: number;
  ratingHomework: number;
  ratingParticipation: number;
  ratingConduct: number;
  ratingSocial: number;
  ratingPunctuality: number;
  ratingNoteTaking: number;
  ratingExcellent: number;
  teacherNote?: string;
}) => {
  const response = await api.post('/teacher/communication-logs', data);
  return response.data;
};

export const getCommunicationLogs = async (studentId: string) => {
  const response = await api.get(`/teacher/communication-logs/${studentId}`);
  return response.data.data;
};

export const getCommunicationLogsByWeek = async (weekEnding: string) => {
  const response = await api.get(`/teacher/communication-logs/week/${weekEnding}`);
  return response.data.data;
};

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
export interface TeacherClass {
  id: string;
  name: string;
  section: string;
  subject: string;
  gradeLevel?: string;
  enrolledStudents?: number;
  capacity?: number;
  schedule?: string;
  room?: string;
}

export interface ClassStudent {
  id: string;
  digitalId: string;
  firstName: string;
  lastName: string;
  email?: string;
  grade?: string;
  status?: string;
  attendanceRate?: number;
}

export interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  subject: string;
  assessmentType: string;
  score: number;
  maxScore: number;
  percentage: number;
  term: string;
  academicYear: string;
  remarks?: string;
}

export interface SubmitGradeData {
  studentId: string;
  classId: string;
  subject: string;
  assessmentType: string;
  score: number;
  maxScore: number;
  term: string;
  academicYear: string;
  remarks?: string;
}

export interface UpdateGradeData {
  score?: number;
  maxScore?: number;
  remarks?: string;
}

// ─── Additional Grade Methods ─────────────────────────────────────────────────
export const getClassGrades = async (classId: string) => {
  const response = await api.get(`/teacher/grades/class/${classId}`);
  return response.data.data;
};

export const submitGrade = async (data: SubmitGradeData) => {
  const response = await api.post('/teacher/grades', data);
  return response.data;
};

export const saveDraftGrades = async (data: { courseId: string; submissionType: string; academicYear?: string; semester?: number }) => {
  const response = await api.post('/teacher/grades/save-draft', data);
  return response.data;
};

export const submitCourseGrades = async (courseId: string, submissionType: string) => {
  const response = await api.post('/teacher/grades/submit-course', { courseId, submissionType });
  return response.data;
};

export const finalizeGradeSubmission = async (data: { courseId: string; submissionType: string; academicYear?: string; semester?: number }) => {
  const response = await api.post('/teacher/grades/finalize-submission', data);
  return response.data;
};

export const getGradeSubmissions = async () => {
  const response = await api.get('/teacher/grade-submissions');
  return response.data.data;
};

export const getDepartmentHeads = async () => {
  const response = await api.get('/teacher/department-heads');
  return response.data.data;
};

export const getDeptPlans = async (status?: string) => {
  const params = status ? `?status=${status}` : '';
  const response = await api.get(`/teacher/dept-plans${params}`);
  return response.data.data;
};

export const reviewDeptPlan = async (planId: string, data: { status: string; feedback?: string; rating?: number }) => {
  const response = await api.post(`/teacher/dept-plans/${planId}/review`, data);
  return response.data;
};

// ─── Annual Plans ─────────────────────────────────────────────────────────────
export const submitAnnualPlan = async (data: any) => {
  const response = await api.post('/teacher/annual-plans', data);
  return response.data;
};

export const getMyAnnualPlans = async (status?: string) => {
  const params = status ? `?status=${status}` : '';
  const response = await api.get(`/teacher/annual-plans${params}`);
  return response.data.data;
};

export const updateAnnualPlan = async (planId: string, data: any) => {
  const response = await api.post(`/teacher/annual-plans/${planId}`, data);
  return response.data;
};

export const getDeptAnnualPlans = async (status?: string) => {
  const params = status ? `?status=${status}` : '';
  const response = await api.get(`/teacher/dept-annual-plans${params}`);
  return response.data.data;
};

export const reviewDeptAnnualPlan = async (planId: string, data: { status: string; feedback?: string; rating?: number }) => {
  const response = await api.post(`/teacher/dept-annual-plans/${planId}/review`, data);
  return response.data;
};


const teacherService = {
  getMyClasses,
  getClassStudents,
  getTeacherDashboard,
  getTeacherSchedule,
  markAttendance,
  getClassAttendance,
  enterGrade,
  bulkEnterGrades,
  getCourseGrades,
  updateGrade,
  deleteGrade,
  getStudentAllGrades,
  submitWeeklyPlan,
  getMyWeeklyPlans,
  updateWeeklyPlan,
  submitCommunicationLog,
  getCommunicationLogs,
  getCommunicationLogsByWeek,
  getClassGrades,
  submitGrade,
  submitCourseGrades,
  getGradeSubmissions,
  getDepartmentHeads,
  getDeptPlans,
  reviewDeptPlan,
  getSchoolAnnouncements,
};

export default teacherService;
