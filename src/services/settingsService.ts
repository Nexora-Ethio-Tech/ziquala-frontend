import api from './api';

export type SystemSettings = Record<string, string>;

export interface BranchGradeFee {
  id: string;
  branch_id: string;
  branch_name: string;
  grade_level: string;
  monthly_fee: number;
  registration_fee: number;
  bus_fee: number;
}

export interface MonthlyProfitTarget {
  id: string;
  branch_id: string;
  branch_name?: string;
  ethiopian_month: number;
  target_year: number;
  target_amount: number;
  student_income?: number;
  staff_payout?: number;
  actual_net_profit?: number;
  actual_amount?: number;
}

export interface BranchProfitSummary {
  branch_id: string;
  branch_name: string;
  ethiopian_month: number;
  target_year: number;
  student_income: number;
  student_transaction_count: number;
  staff_payout: number;
  staff_payout_is_projected: boolean;
  payroll_status: string | null;
  suggested_target: number;
  actual_net_profit: number;
  saved_target: number | null;
  gregMonth: number;
  gregYear: number;
  monthName: string;
}

export interface SmtpSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from: string;
}

const settingsService = {
  getPublicSystemSettings: async (): Promise<SystemSettings> => {
    const response = await api.get('/public/system-settings');
    return response.data.data;
  },

  getSystemSettings: async (): Promise<SystemSettings> => {
    const response = await api.get('/super-admin/system-settings');
    return response.data.data;
  },

  updateSystemSettings: async (settings: SystemSettings): Promise<SystemSettings> => {
    const response = await api.put('/super-admin/system-settings', settings);
    return response.data.data;
  },

  getSmtpSettings: async (): Promise<SmtpSettings> => {
    const response = await api.get('/super-admin/smtp-settings');
    return response.data.data;
  },

  updateSmtpSettings: async (settings: Partial<SmtpSettings>) => {
    const response = await api.put('/super-admin/smtp-settings', settings);
    return response.data;
  },

  testSmtpSettings: async (email: string) => {
    const response = await api.post('/super-admin/smtp-settings/test', { email });
    return response.data;
  },

  getBranchGradeFees: async (params?: { branchId?: string }): Promise<BranchGradeFee[]> => {
    const response = await api.get('/super-admin/branch-grade-fees', { params });
    return response.data.data;
  },

  upsertBranchGradeFee: async (data: {
    branchId: string;
    gradeLevel: string;
    monthlyFee: number;
    registrationFee: number;
    busFee: number;
  }) => {
    const response = await api.post('/super-admin/branch-grade-fees', data);
    return response.data.data as BranchGradeFee;
  },

  deleteBranchGradeFee: async (id: string) => {
    const response = await api.delete(`/super-admin/branch-grade-fees/${id}`);
    return response.data;
  },

  getBranchProfitSummary: async (params: {
    branchId: string;
    ethiopianMonth: number;
    year?: number;
  }): Promise<BranchProfitSummary> => {
    const response = await api.get('/super-admin/profit-targets/branch-summary', { params });
    return response.data.data;
  },

  getProfitTargets: async (params?: {
    year?: number;
    branchId?: string;
  }): Promise<MonthlyProfitTarget[]> => {
    const response = await api.get('/super-admin/profit-targets', { params });
    return response.data.data;
  },

  upsertProfitTarget: async (data: {
    branchId: string;
    ethiopianMonth: number;
    targetAmount: number;
    year?: number;
  }) => {
    const response = await api.post('/super-admin/profit-targets', data);
    return response.data.data;
  },

  getAcademicYears: async () => {
    const response = await api.get('/super-admin/academic-years');
    return response.data.data;
  },

  activateAcademicYear: async (id: string) => {
    const response = await api.post(`/super-admin/academic-years/${id}/activate`);
    return response.data.data;
  },
};

export default settingsService;
