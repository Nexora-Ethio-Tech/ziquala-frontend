import api from './api';

export interface FinanceSetting {
  id: string;
  key: string;
  value: number;
  updated_by?: string;
  updated_at?: string;
}

export interface FinanceSettingsAudit {
  id: string;
  setting_key: string;
  old_value: number | null;
  new_value: number;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  changed_by_username?: string;
}

export interface EmployeePayrollProfile {
  user_id: string;
  name: string;
  digital_id: string;
  role: string;
  branch_id: string | null;
  email: string;
  status: string;
  is_active: boolean;
  profile_id: string | null;
  basic_salary: number;
  transport_allowance: number;
  housing_allowance: number;
  position_allowance: number;
  total_allowance: number;
  overtime_rate_per_hour: number;
  bank_account: string | null;
  tin_number: string | null;
}

export interface PayrollRun {
  id: string;
  month: string;
  year: number;
  branch_id: string | null;
  status: 'draft' | 'finalized' | 'exported';
  generated_by: string;
  generated_by_name?: string;
  finalized_by?: string;
  finalized_by_name?: string;
  branch_name?: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_tax: number;
  total_pension_employee: number;
  total_pension_employer: number;
  created_at: string;
  finalized_at?: string;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name: string;
  employee_digital_id?: string;
  employee_role?: string;
  basic_salary: number;
  transport_allowance: number;
  housing_allowance: number;
  position_allowance: number;
  overtime_hours: number;
  overtime_amount: number;
  gross_salary: number;
  absent_days: number;
  penalty_amount: number;
  loan_deduction: number;
  taxable_income: number;
  income_tax: number;
  pension_employee: number;
  pension_employer: number;
  total_deductions: number;
  net_pay: number;
  /** Actual amount disbursed — sourced from finance_transactions for the payroll month */
  actual_paid: number;
  /** 'paid' if actual_paid > 0, otherwise 'unpaid' */
  payment_status: 'paid' | 'unpaid';
}

export interface StaffNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'loan' | 'payroll' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface SchoolLiability {
  staff_count: number;
  total_basic: number;
  total_gross: number;
  total_penalties: number;
  total_loan_repayments: number;
  total_tax: number;
  total_pension_employee: number;
  total_pension_employer: number;
  total_net_pay: number;
}

const payrollService = {
  // Global Settings (Super Admin Only)
  getFinanceSettings: async (): Promise<FinanceSetting[]> => {
    const response = await api.get('/super-admin/finance-settings');
    return response.data.data;
  },

  updateFinanceSetting: async (key: string, value: number): Promise<FinanceSetting> => {
    const response = await api.post(`/super-admin/finance-settings/${key}`, { value });
    return response.data.data;
  },

  getFinanceSettingsAuditLog: async (): Promise<FinanceSettingsAudit[]> => {
    const response = await api.get('/super-admin/finance-settings/audit-log');
    return response.data.data;
  },

  // Employee Payroll Profiles
  getAllProfiles: async (params?: { branchId?: string }): Promise<EmployeePayrollProfile[]> => {
    const response = await api.get('/finance-clerk/employee-profiles', { params });
    return response.data.data;
  },

  getProfile: async (userId: string): Promise<EmployeePayrollProfile> => {
    const response = await api.get(`/finance-clerk/employee-profiles/${userId}`);
    return response.data.data;
  },

  createOrUpdateProfile: async (data: {
    userId: string;
    basicSalary: number;
    transportAllowance?: number;
    housingAllowance?: number;
    positionAllowance?: number;
    overtimeRatePerHour?: number;
    bankAccount?: string;
    tinNumber?: string;
  }): Promise<any> => {
    const response = await api.post('/finance-clerk/employee-profiles', data);
    return response.data.data;
  },

  // Staff Attendance
  recordAttendance: async (data: {
    userId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused' | 'leave';
  }): Promise<any> => {
    const response = await api.post('/finance-clerk/employee-attendance', data);
    return response.data.data;
  },

  getAttendance: async (userId: string, month: number, year: number): Promise<any[]> => {
    const response = await api.get(`/finance-clerk/employee-attendance/${userId}`, {
      params: { month, year }
    });
    return response.data.data;
  },

  // Payroll Management (Finance Clerk / Super Admin / Auditor)
  generatePayroll: async (data: {
    month: string;
    year: number;
    branchId?: string | null;
    overtimeHoursMap?: { [employeeId: string]: number };
  }): Promise<PayrollRun> => {
    const response = await api.post('/payroll/generate', data);
    return response.data.data;
  },

  getPayrollRuns: async (params?: { branchId?: string; status?: string }): Promise<PayrollRun[]> => {
    const response = await api.get('/payroll/runs', { params });
    return response.data.data;
  },

  getPayrollRun: async (id: string): Promise<{ run: PayrollRun; items: PayrollItem[] }> => {
    const response = await api.get(`/payroll/runs/${id}`);
    return response.data.data;
  },

  deletePayrollRun: async (id: string): Promise<any> => {
    const response = await api.delete(`/payroll/runs/${id}`);
    return response.data;
  },

  finalizePayroll: async (id: string): Promise<any> => {
    const response = await api.post(`/payroll/runs/${id}/finalize`);
    return response.data;
  },

  getSchoolLiability: async (month: string, year: number): Promise<SchoolLiability> => {
    const response = await api.get('/payroll/liability', {
      params: { month, year }
    });
    return response.data.data;
  },

  exportPayrollUrl: (id: string, format: 'csv' | 'html'): string => {
    const token = localStorage.getItem('ziquala_token');
    return `${api.defaults.baseURL}/payroll/export/${id}?format=${format}&token=${token}`;
  },

  downloadCustomExport: async (month: string, year: number, includeStaff: boolean, includeOther: boolean): Promise<void> => {
    const response = await api.get('/payroll/custom-export', {
      params: { month, year, includeStaff, includeOther },
      responseType: 'blob'
    });

    const contentType = String(response.headers?.['content-type'] || '');

    // Server returned a JSON response (empty period notice) instead of a file
    if (contentType.includes('application/json') || (response.data as Blob)?.type === 'application/json') {
      const text = await (response.data as Blob).text();
      try {
        const json = JSON.parse(text);
        // Graceful empty-period message from the server
        throw new Error(json.message || 'No records were found for the selected period.');
      } catch (parseErr: any) {
        if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
        throw new Error('No records were found for the selected period.');
      }
    }

    // Normal file download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditor_report_${month}_${year}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Personal Payslip ("My Finance")
  getMyPayslips: async (): Promise<any[]> => {
    const response = await api.get('/payroll/my-payslips');
    return response.data.data;
  },

  getMyPayslip: async (month: string, year: number): Promise<PayrollItem | null> => {
    try {
      const response = await api.get('/payroll/my-payslip', {
        params: { month, year }
      });
      return response.data.data;
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },

  // In-app Notifications
  getMyNotifications: async (): Promise<StaffNotification[]> => {
    const response = await api.get('/payroll/notifications');
    return response.data.data;
  },

  markNotificationRead: async (id: string): Promise<any> => {
    const response = await api.post(`/payroll/notifications/${id}/read`);
    return response.data.data;
  }
};

export default payrollService;
