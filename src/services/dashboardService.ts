import api from './api';

export const dashboardService = {
  // Super Admin Dashboard
  getSuperAdminDashboard: async () => {
    const response = await api.get('/super-admin/dashboard');
    return response.data;
  },

  // Super Admin Analytics
  getSuperAdminAnalytics: async (branchId?: string | null) => {
    const params = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    const response = await api.get(`/super-admin/analytics${params}`);
    return response.data;
  },

  // School Admin Dashboard
  getSchoolAdminDashboard: async () => {
    const response = await api.get('/school-admin/dashboard');
    return response.data;
  },

  // Teacher Dashboard
  getTeacherDashboard: async () => {
    const response = await api.get('/teacher/dashboard');
    return response.data;
  },

  // Vice Principal Dashboard
  getVicePrincipalDashboard: async () => {
    const response = await api.get('/vice-principal/dashboard');
    return response.data;
  },

  // Events (Calendar) — role-aware
  getEvents: async (role: string, branchId?: string | null): Promise<any[]> => {
    if (role === 'super-admin') {
      const params = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      const response = await api.get(`/super-admin/events${params}`);
      return response.data.data ?? [];
    }
    const response = await api.get('/school-admin/events');
    return response.data.data ?? [];
  },

  createEvent: async (
    role: string,
    data: { title: string; date: string; endDate?: string; type: string; description?: string; branchId?: string | null }
  ): Promise<any> => {
    if (role === 'super-admin') {
      const response = await api.post('/super-admin/events', data);
      return response.data.data;
    }
    const response = await api.post('/school-admin/events', data);
    return response.data.data;
  },

  updateEvent: async (role: string, id: string, data: any): Promise<any> => {
    if (role === 'super-admin') {
      const response = await api.post(`/super-admin/events/${id}`, data);
      return response.data.data;
    }
    const response = await api.post(`/school-admin/events/${id}`, data);
    return response.data.data;
  },

  deleteEvent: async (role: string, id: string): Promise<void> => {
    if (role === 'super-admin') {
      await api.delete(`/super-admin/events/${id}`);
    } else {
      await api.delete(`/school-admin/events/${id}`);
    }
  },
};
