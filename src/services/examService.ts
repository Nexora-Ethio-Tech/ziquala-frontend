import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExamQuestion {
  id: string;
  text: string;
  type: string;
  options: { id: string; text: string }[];
  points?: number;
}

export interface ExamSession {
  id: string | null;
  status: string;
  startTime: string;
  endTime: number;
  terminated?: boolean;
  violationCount?: number;
  finalScore?: number | null;
}

export interface ExamDetail {
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    instructions?: string;
    teacherName?: string;
    passwordRequired?: boolean;
    showScore?: boolean;
  };
  session: ExamSession;
  questions: ExamQuestion[];
  savedAnswers: Record<string, string>;
  variationCode?: string;
}

export interface PublishedExam {
  id: string;
  title: string;
  examType: string;
  durationMinutes: number;
  teacherName: string;
  questionCount: number;
  sessionStatus: 'available' | 'active' | 'submitted' | 'terminated' | null;
  finalScore: number | null;
  violated: boolean;
  violationCount: number;
  passwordRequired: boolean;
}

export interface SubmitResult {
  score: number;
  total_marks: number;
  percentage: number;
}

// ─── Student Exam APIs ────────────────────────────────────────────────────────

export const getAvailableExams = async (): Promise<PublishedExam[]> => {
  try {
    const response = await api.get('/student/exams');
    return response.data.data || [];
  } catch (err) {
    console.warn('Failed to fetch available student exams:', err);
    return [];
  }
};

export const getExamById = async (examId: string): Promise<ExamDetail> => {
  const response = await api.get(`/student/exams/${examId}`);
  return response.data.data;
};

export const startExamSession = async (examId: string): Promise<any> => {
  const response = await api.post(`/student/exams/${examId}/start`);
  return response.data.data;
};

export const saveExamAnswer = async (
  examId: string,
  questionId: string,
  answer: string,
  sessionId?: string
): Promise<void> => {
  await api.post(`/student/exams/${examId}/answer`, { questionId, answer, sessionId });
};

export const submitExam = async (examId: string): Promise<SubmitResult> => {
  const response = await api.post(`/student/exams/${examId}/submit`);
  return response.data.data;
};

export const verifyExamPassword = async (examId: string, password: string): Promise<any> => {
  const response = await api.post(`/student/exams/${examId}/verify-password`, { password });
  return response.data.data;
};

/** Report a browser-switch / fullscreen-exit violation. Returns the new violation count. */
export const reportViolation = async (examId: string): Promise<number> => {
  try {
    const response = await api.post(`/student/exams/${examId}/violation`);
    return response.data.data?.violationCount || 1;
  } catch {
    return 1;
  }
};

/** Terminate exam (3rd strike or manual stop). Score is saved server-side. */
export const terminateExam = async (examId: string, reason = 'manual_stop'): Promise<void> => {
  await api.post(`/student/exams/${examId}/terminate`, { reason });
};

/** Validate teacher-issued reset PIN. Returns true if valid (session unblocked). */
export const validateResetPin = async (examId: string, pin: string): Promise<boolean> => {
  try {
    const response = await api.post(`/student/exams/${examId}/reset-pin`, { pin });
    return response.data.data?.unlocked === true;
  } catch {
    return false;
  }
};

// ─── Teacher Exam APIs ────────────────────────────────────────────────────────

export const getTeacherExams = async (): Promise<{ draftExams: any[]; publishedExams: any[] }> => {
  const response = await api.get('/teacher/exams');
  return response.data.data;
};

export const getTeacherExamById = async (examId: string): Promise<any> => {
  const response = await api.get(`/teacher/exams/${examId}`);
  return response.data.data;
};

export const saveTeacherExam = async (examData: {
  classId: string; title: string; examType: string; totalMarks: number; duration: number;
  instructions?: string; selectedSection?: string; gradeId?: string; subjectId?: string;
  examPassword?: string | null; isLocked?: boolean; passwordRequired?: boolean; questions?: any[];
  showScore?: boolean; isGraded?: boolean; assessmentType?: string | null;
}): Promise<any> => {
  const response = await api.post('/teacher/exams', examData);
  return response.data.data;
};

export const updateTeacherExam = async (examId: string, updateData: any): Promise<any> => {
  const response = await api.post(`/teacher/exams/${examId}`, updateData);
  return response.data.data;
};

export const publishTeacherExam = async (examId: string): Promise<any> => {
  const response = await api.post(`/teacher/exams/${examId}/publish`);
  return response.data.data;
};

export const deleteTeacherExam = async (examId: string): Promise<any> => {
  const response = await api.delete(`/teacher/exams/${examId}`);
  return response.data.data;
};

/** Teacher issues a reset PIN to unblock a terminated student session. */
export const issueResetPin = async (examId: string, studentId: string, pin: string): Promise<any> => {
  const response = await api.post(`/teacher/exams/${examId}/issue-reset-pin`, { studentId, pin });
  return response.data.data;
};

// ─── Grade / Subject Selection APIs ──────────────────────────────────────────

export const getGradesForExams = async (): Promise<any[]> => {
  try { const r = await api.get('/teacher/exam-grades'); return r.data.data || []; } catch { return []; }
};

export const getCoursesByGradeForExams = async (gradeId: string): Promise<any[]> => {
  try { const r = await api.get(`/teacher/exam-grades/${gradeId}/courses`); return r.data.data || []; } catch { return []; }
};

export const getTeacherCoursesForExams = async (): Promise<any[]> => {
  try { const r = await api.get('/teacher/exam-courses'); return r.data.data || []; } catch { return []; }
};

// Legacy createExam (old exams table)
export const createExam = async (examData: any): Promise<any> => {
  const response = await api.post('/teacher/exams', examData);
  return response.data.data;
};
