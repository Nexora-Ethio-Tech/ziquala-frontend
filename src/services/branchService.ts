import api from './api';
import { cachedList } from './listCache';

export interface Branch {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
}

export interface CreateBranchData {
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
}

export interface UpdateBranchData {
  name?: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
}

export const branchService = {
  // Get all branches
  getAllBranches: async () => {
    const response = await api.get('/super-admin/branches');
    return response.data;
  },

  getAllBranchesGuest: async () => {
    return cachedList('guest-branches', async () => {
      const response = await api.get('/guest/branches', { timeout: 10000 });
      return response.data;
    });
  },

  // Get branch by ID
  getBranchById: async (branchId: string) => {
    const response = await api.get(`/super-admin/branches/${branchId}`);
    return response.data;
  },

  // Create new branch
  createBranch: async (data: CreateBranchData) => {
    const response = await api.post('/super-admin/branches', data);
    return response.data;
  },

  // Update branch
  updateBranch: async (branchId: string, data: UpdateBranchData) => {
    const response = await api.post(`/super-admin/branches/${branchId}`, data);
    return response.data;
  },

  // Delete branch
  deleteBranch: async (branchId: string) => {
    const response = await api.delete(`/super-admin/branches/${branchId}`);
    return response.data;
  },
};

// Academic Year Interfaces
export interface AcademicYear {
  id: string;
  yearName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAcademicYearData {
  yearName: string;
  startDate: string;
  endDate: string;
}

// Report Interfaces
export interface SystemReport {
  totalUsers: number;
  totalBranches: number;
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
}

export interface BranchReport {
  branchId: string;
  branchName: string;
  totalStudents: number;
  totalTeachers: number;
  totalStaff: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  attendanceRate: number;
}

// Academic Year Methods
export const createGlobalAcademicYear = async (data: CreateAcademicYearData) => {
  const response = await api.post('/super-admin/academic-years', data);
  return response.data;
};

export const getAllAcademicYears = async () => {
  const response = await api.get('/super-admin/academic-years');
  return response.data;
};

export const activateAcademicYear = async (id: string) => {
  const response = await api.post(`/super-admin/academic-years/${id}/activate`);
  return response.data;
};

// Report Methods
export const getSystemReport = async (): Promise<SystemReport> => {
  const response = await api.get('/super-admin/reports/system');
  return response.data;
};

export const getBranchReport = async (branchId: string): Promise<BranchReport> => {
  const response = await api.get(`/super-admin/reports/branch/${branchId}`);
  // API returns {success: true, data: {...}}, so return the whole response
  return response.data.data;
};
