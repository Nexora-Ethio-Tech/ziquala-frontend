import api from './api';

export interface Student {
  id: string;
  digitalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: string;
  grade: string;
  classId?: string;
  className?: string;
  branchId: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Graduated';
  graduationYear?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  address?: string;
  enrollmentDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: string;
  grade: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  address?: string;
}

export interface UpdateStudentData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  grade?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'Graduated';
  graduationYear?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  address?: string;
}

export interface StudentFilters {
  classId?: string;
  grade?: string;
  status?: string;
  graduationYear?: string;
}

export interface StudentExportRecord {
  student: {
    student_id: string;
    user_id: string;
    digital_id: string;
    name: string;
    username?: string | null;
    email?: string | null;
    branch_name?: string | null;
    grade?: string | null;
    section?: string | null;
    status?: string | null;
    enrolled_at?: string | null;
    graduation_year?: string | null;
    sex?: string | null;
    age?: string | null;
    birth_date?: string | null;
    birth_place?: string | null;
    region?: string | null;
    town?: string | null;
    house_no?: string | null;
    phone_no?: string | null;
    po_box?: string | null;
  };
  application: Record<string, string | number | boolean | null> | null;
  parents: Array<{
    digital_id?: string | null;
    username?: string | null;
    name?: string | null;
    phone?: string | null;
  }>;
  admission_match: 'linked' | 'matched' | 'ambiguous' | 'missing';
}

const studentService = {
  createStudent: async (data: CreateStudentData): Promise<Student> => {
    const response = await api.post('/school-admin/students', data);
    return response.data.data;
  },

  getAllStudents: async (filters?: StudentFilters): Promise<Student[]> => {
    const response = await api.get('/school-admin/students', { params: filters });
    return response.data.data;
  },

  getStudentExportRecords: async (studentIds: string[]): Promise<StudentExportRecord[]> => {
    const records: StudentExportRecord[] = [];
    // Send exactly the filtered profile IDs; batching also accommodates large branches.
    for (let start = 0; start < studentIds.length; start += 500) {
      const response = await api.post('/school-admin/students/export', {
        studentIds: studentIds.slice(start, start + 500),
      });
      records.push(...response.data.data);
    }
    const byId = new Map(records.map(record => [record.student.student_id, record]));
    if (studentIds.some(id => !byId.has(id))) {
      throw new Error('Some students are no longer available. Refresh the list and export again.');
    }
    return studentIds.map(id => byId.get(id)!);
  },

  getStudentById: async (id: string): Promise<Student> => {
    const response = await api.get(`/school-admin/students/${id}`);
    return response.data.data;
  },

  updateStudent: async (id: string, data: UpdateStudentData): Promise<Student> => {
    const response = await api.post(`/school-admin/students/${id}`, data);
    return response.data.data;
  },

  deleteStudent: async (id: string): Promise<void> => {
    // Delete a student by user id using the users endpoint
    await api.delete(`/school-admin/users/${id}`);
  },

  assignClass: async (id: string, classId: string): Promise<Student> => {
    const response = await api.post(`/school-admin/students/${id}/assign-class`, { classId });
    return response.data.data;
  },

  getStudentsByClass: async (classId: string): Promise<Student[]> => {
    const response = await api.get(`/school-admin/students/class/${classId}`);
    return response.data.data;
  },

  bulkUpdateStatus: async (userIds: string[], status: string, graduationYear?: string) => {
    const response = await api.post('/school-admin/students/bulk-status', { userIds, status, graduationYear });
    return response.data;
  },

  bulkShiftGrade: async (studentIds: string[], grade: string, section?: string) => {
    const response = await api.post('/school-admin/students/bulk-grade', { studentIds, grade, section });
    return response.data;
  },

  resetStudentPassword: async (
    studentId: string,
    options: { target: 'student' | 'parent' | 'both'; parentPhone?: string }
  ): Promise<{ studentPIN?: string; parentPIN?: string; parentName?: string; temporaryPassword?: string }> => {
    const response = await api.post(`/school-admin/students/${studentId}/reset-password`, options);
    return response.data.data;
  },
};

export default studentService;
