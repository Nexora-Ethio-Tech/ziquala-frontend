import api from './api';

// Dashboard
export const getVPDashboard = async () => {
  const response = await api.get('/vice-principal/dashboard');
  return response.data.data;
};

// Absence Queue
export const getAbsenceQueue = async (status?: string) => {
  const params = status ? `?status=${status}` : '';
  const response = await api.get(`/vice-principal/absence-queue${params}`);
  return response.data;
};

export const updateAbsenceStatus = async (id: string, status: 'pending' | 'excused' | 'notified') => {
  const response = await api.post(`/vice-principal/absence-queue/${id}`, { status });
  return response.data;
};

// Weekly Plans
export const getWeeklyPlans = async (status?: string, teacherId?: string) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (teacherId) params.append('teacherId', teacherId);
  const response = await api.get(`/vice-principal/weekly-plans?${params}`);
  return response.data;
};

export const reviewWeeklyPlan = async (planId: string, data: {
  status: 'Approved' | 'Revision Required';
  deanFeedback?: string;
  deanRating?: number;
}) => {
  const response = await api.post(`/vice-principal/weekly-plans/${planId}/review`, data);
  return response.data;
};

// Grade Locks
export const getGradeLocks = async () => {
  const response = await api.get('/vice-principal/grade-locks');
  return response.data;
};

export const toggleGradeLock = async (data: {
  gradeLevel: string;
  isLocked: boolean;
  academicYearId?: string;
}) => {
  const response = await api.post('/vice-principal/grade-locks', data);
  return response.data;
};

// Student Transcript
export const getStudentTranscript = async (studentId: string, academicYear?: string, semester?: number) => {
  const params = new URLSearchParams();
  if (academicYear) params.append('academicYear', academicYear);
  if (semester !== undefined) params.append('semester', String(semester));
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/vice-principal/students/${studentId}/transcript${queryString}`);
  return response.data.data;
};

export const searchStudents = async (query: string) => {
  const params = new URLSearchParams({ query });
  const response = await api.get(`/vice-principal/students/search?${params.toString()}`);
  return response.data.data;
};

// Teachers
export const getVPTeachers = async () => {
  const response = await api.get('/vice-principal/teachers');
  return response.data;
};

export const getTeacherAttendanceDetail = async (userId: string, startDate: string, endDate: string) => {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await api.get(`/vice-principal/teachers/${userId}/attendance?${params}`);
  return response.data.data;
};

// Teacher Leaderboard
export const getLeaderboard = async () => {
  const response = await api.get('/vice-principal/teachers/leaderboard');
  return response.data.data;
};

export const rateTeacher = async (teacherId: string, rating: number) => {
  const response = await api.post(`/vice-principal/teachers/${teacherId}/rate`, { rating });
  return response.data.data;
};

export const resetLeaderboard = async () => {
  const response = await api.post('/vice-principal/teachers/leaderboard/reset');
  return response.data;
};

// Attendance Summary
export const getAttendanceSummary = async (date?: string, gradeLevel?: string) => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (gradeLevel) params.append('gradeLevel', gradeLevel);
  const response = await api.get(`/vice-principal/attendance-summary?${params}`);
  return response.data;
};

// Academic Performance
export const getAcademicPerformance = async (gradeLevel?: string, courseId?: string) => {
  const params = new URLSearchParams();
  if (gradeLevel) params.append('gradeLevel', gradeLevel);
  if (courseId) params.append('courseId', courseId);
  const response = await api.get(`/vice-principal/academic-performance?${params}`);
  return response.data;
};

// Grade Management
export const getGradesAndSections = async () => {
  const response = await api.get('/vice-principal/grade-management/sections');
  return response.data.data;
};

export const getStudentsBySection = async (sectionId: string, academicYear?: string) => {
  const params = new URLSearchParams();
  if (academicYear) params.append('academicYear', academicYear);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/vice-principal/grade-management/sections/${sectionId}/students${queryString}`);
  return response.data.data;
};

export const getCoursesBySection = async (sectionId: string) => {
  const response = await api.get(`/vice-principal/grade-management/sections/${sectionId}/courses`);
  return response.data.data;
};

export const getSectionGrades = async (sectionId: string, academicYear?: string, semester?: number) => {
  const params = new URLSearchParams();
  if (academicYear) params.append('academicYear', academicYear);
  if (semester !== undefined) params.append('semester', String(semester));
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/vice-principal/grade-management/sections/${sectionId}/grades${queryString}`);
  return response.data.data;
};

export const generateSectionResults = async (sectionId: string, academicYear?: string, semester?: number) => {
  const response = await api.post(`/vice-principal/grade-management/generate-results/${sectionId}`, {
    academicYear,
    semester
  });
  return response.data.data;
};

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
export interface VPDashboard {
  totalStudents?: number;
  todayAttendanceRate?: number;
  pendingAttendanceReviews?: number;
  attendanceAlerts?: number;
  pendingPlansCount?: number;
  pendingAbsencesCount?: number;
}

export interface AttendanceOverview {
  classId: string;
  className: string;
  section: string;
  teacherName: string;
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
}

export interface AttendanceAlert {
  id: string;
  studentName: string;
  className: string;
  date: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  details: string;
  status: 'Pending' | 'Approved' | 'Flagged';
}

// ─── Additional VP Methods ────────────────────────────────────────────────────────
export const getAttendanceOverview = async (date?: string) => {
  const params = date ? `?date=${date}` : '';
  const response = await api.get(`/vice-principal/attendance-overview${params}`);
  return response.data.data;
};

export const getAttendanceAlerts = async () => {
  const response = await api.get('/vice-principal/attendance-alerts');
  return response.data.data;
};

export const approveAttendance = async (alertId: string, data: { status: 'Approved' | 'Flagged'; remarks?: string }) => {
  const response = await api.post(`/vice-principal/attendance-alerts/${alertId}`, data);
  return response.data;
};

// Grade Submissions
export const getVPGradeSubmissions = async () => {
  const response = await api.get('/vice-principal/grade-submissions');
  return response.data.data;
};

export const getVPSubmittedGrades = async (courseId: string, submissionType: string) => {
  const response = await api.get(`/vice-principal/grades/${courseId}/${encodeURIComponent(submissionType)}`);
  return response.data.data;
};

export const unlockGradeSubmission = async (data: {
  courseId: string;
  submissionType: string;
  academicYear?: string;
  semester?: number;
}) => {
  const response = await api.post('/vice-principal/unlock-grade-submission', data);
  return response.data;
};

export interface TeacherOfWeekVoteSummary {
  cycleKey: string;
  isOpen: boolean;
  totalVotes: number;
  teachers: Array<{
    teacherId: string;
    teacherName: string;
    department: string | null;
    subjects: string[];
    weekVotes: number;
    overallRating: number;
    overallVoteCount: number;
  }>;
}

export const getTeacherOfWeekVotes = async (): Promise<TeacherOfWeekVoteSummary> => {
  const response = await api.get('/vice-principal/teacher-of-week/votes');
  return response.data.data;
};

export const getStaffAbsentCount = async (date?: string) => {
  const params = date ? `?date=${date}` : '';
  const response = await api.get(`/vice-principal/staff-absent-count${params}`);
  return response.data.data;
};

export const getCommunicationSummary = async (sectionId: string, weekEnding: string) => {
  const params = new URLSearchParams({ sectionId, weekEnding });
  const response = await api.get(`/vice-principal/communication-logs/summary?${params}`);
  return response.data.data;
};

