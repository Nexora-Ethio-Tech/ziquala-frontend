import api from './api';

export interface DashboardAnnouncement {
  id: string;
  priority: string;
  title: string;
  content: string;
  timestamp: string;
  category: string;
  driverName?: string;
}

export interface WeeklyScheduleEntry {
  day: string;
  timeSlot: string;
  subject: string;
  teacher: string;
  room: string;
}

// Student Dashboard Interface
export interface StudentDashboard {
  student: {
    id: string;
    digitalId: string;
    name: string;
    email: string;
    grade: string;
    class: string;
    status: string;
  };
  stats: {
    totalCourses: number;
    averageGrade: number | null;
    averageGradeDisplay: string;
    attendanceRate: number | null;
    currentSemester: number;
    academicYear: string;
  };
  weeklySchedule: WeeklyScheduleEntry[];
  schoolAnnouncements: DashboardAnnouncement[];
  logisticsAnnouncements: DashboardAnnouncement[];
}

export interface TeacherOfWeekTeacher {
  id: string;
  name: string;
  subjects: string[];
  department: string | null;
  votes?: number;
}

export interface TeacherOfWeekPayload {
  isOpen: boolean;
  cycleKey: string;
  ethiopianWeekStart: string;
  hasVoted: boolean;
  votedTeacherId: string | null;
  teachers: TeacherOfWeekTeacher[];
  /** The current leading / best teacher for this cycle (present once any votes exist). */
  bestTeacher?: TeacherOfWeekTeacher | null;
}

// Course Interface
export interface StudentCourse {
  id: string;
  name: string;
  code: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  schedule: string;
  room: string;
  credits: number;
  currentGrade?: number;
  total?: number | null;
  final_50?: number | null;
  max_quiz?: number | null;
  quiz_10?: number | null;
  assignment_10?: number | null;
  max_assignment?: number | null;
  max_mid?: number | null;
  mid_30?: number | null;
  max_final?: number | null;
  grades?: Record<string, number | null>;
}

// Grade Interface
export interface StudentGrade {
  id: string;
  courseId: string;
  courseName: string;
  assessmentType: string;
  score: number;
  maxScore: number;
  percentage: number;
  weight: string;
  date: string;
  feedback?: string;
}

// Schedule Interface
export interface StudentSchedule {
  day: string;
  timeSlot: string;
  subject: string;
  teacher: string;
  room: string;
}

// Transcript Interface
export interface Transcript {
  academicYear: string;
  semester: string;
  courses: Array<{
    courseName: string;
    courseCode: string;
    credits: number;
    grade: number;
    letterGrade: string;
  }>;
  gpa: number;
  totalCredits: number;
}

// Student Dashboard Methods
export const getStudentDashboard = async (): Promise<StudentDashboard> => {
  const response = await api.get('/student/dashboard');
  return response.data.data;
};

export const getTeacherOfWeek = async (): Promise<TeacherOfWeekPayload> => {
  const response = await api.get('/student/teacher-of-week');
  return response.data.data;
};

export const submitTeacherOfWeekVote = async (teacherId: string) => {
  const response = await api.post('/student/teacher-of-week/vote', { teacherId });
  return response.data.data;
};

export const getMyCourses = async (): Promise<StudentCourse[]> => {
  const response = await api.get('/student/courses');
  return response.data.data;
};

export const getMyGrades = async (courseId?: string): Promise<StudentGrade[]> => {
  const url = courseId
    ? `/student/grades/${courseId}`
    : '/student/grades';
  const response = await api.get(url);
  return response.data.data;
};

export const getMySchedule = async (): Promise<StudentSchedule[]> => {
  const response = await api.get('/student/schedule');
  return response.data.data;
};

export const getMyTranscript = async (academicYear?: string, semester?: string): Promise<Transcript[]> => {
  const params = new URLSearchParams();
  if (academicYear) params.append('academicYear', academicYear);
  if (semester) params.append('semester', semester);

  const response = await api.get(`/student/transcript?${params.toString()}`);
  return response.data.data;
};

export const getMyHistory = async (year: string, semester?: number): Promise<any> => {
  const params = new URLSearchParams();
  params.append('year', year);
  if (semester) params.append('semester', semester.toString());

  const response = await api.get(`/student/history?${params.toString()}`);
  return response.data.data;
};

export const getMyGradesForSemester = async (
  semester: number,
  year?: string,
  subjectId?: string
): Promise<any> => {
  const params = new URLSearchParams();
  params.append('semester', semester.toString());
  if (year) params.append('year', year);
  if (subjectId) params.append('subject_id', subjectId);
  const response = await api.get(`/student/grades?${params.toString()}`);
  return response.data.data;
};

export const getMyAttendance = async (): Promise<any> => {
  const response = await api.get('/student/attendance');
  return response.data.data;
};

// Get published grading config for a grade level (works for Student and Parent too)
export const getGradingConfigsForGrade = async (gradeLevel: string): Promise<Array<{ id: string; label: string; maxWeight: number }>> => {
  const response = await api.get(`/grading-configs/${encodeURIComponent(gradeLevel)}`);
  return response.data.data;
};
