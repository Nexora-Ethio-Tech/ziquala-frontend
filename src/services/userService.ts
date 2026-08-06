import api from './api';
import { API_ENDPOINTS } from '../config/api';

export const userService = {
  // Create School Admin
  createSchoolAdmin: async (data: { name: string; email: string; branchId: string; password?: string, profileImage?: string }) => {
    const response = await api.post(API_ENDPOINTS.CREATE_SCHOOL_ADMIN, data);
    return response.data;
  },

  // Create Vice Principal
  createVicePrincipal: async (data: { name: string; email: string; branchId: string }) => {
    const response = await api.post(API_ENDPOINTS.CREATE_VICE_PRINCIPAL, data);
    return response.data;
  },

  // Future backend endpoint for the Ziquala academic oversight role.
  createAcademicManager: async (data: { name: string; email: string; branchId: string }) => {
    const response = await api.post('/super-admin/academic-managers', data);
    return response.data;
  },

  // Get all users
  getAllUsers: async (filters: { role?: string; status?: string; branchId?: string } = {}) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    const response = await api.get(`${API_ENDPOINTS.GET_ALL_USERS}?${params}`);
    return response.data;
  },

  getAllUsersGuest: async (filters: { role?: string; status?: string; branchId?: string } = {}) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    const response = await api.get(`/guest/users?${params}`);
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    const response = await api.get(API_ENDPOINTS.GET_USER(userId));
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId: string, status: 'Approved' | 'Pending' | 'Revoked') => {
    const response = await api.post(API_ENDPOINTS.UPDATE_USER_STATUS(userId), { status });
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string) => {
    const userJson = localStorage.getItem('ziquala_user');
    const role = userJson ? JSON.parse(userJson).role : null;
    const isSchoolAdmin = role === 'school-admin';
    const endpoint = isSchoolAdmin
      ? API_ENDPOINTS.DELETE_BRANCH_USER(userId)
      : API_ENDPOINTS.DELETE_USER(userId);
    const response = await api.delete(endpoint);
    return response.data;
  },

  // Register user (School Admin)
  registerUser: async (data: { name: string; email: string; role: string; grade?: string }) => {
    const response = await api.post(API_ENDPOINTS.REGISTER_USER, data);
    return response.data;
  },

  // Get branch users (School Admin)
  getBranchUsers: async (filters: { role?: string; status?: string } = {}) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    const response = await api.get(`${API_ENDPOINTS.GET_BRANCH_USERS}?${params}`);
    return response.data;
  },

  // Update user details (Super Admin)
  updateUser: async (userId: string, data: { name?: string; email?: string }) => {
    const response = await api.post(API_ENDPOINTS.UPDATE_USER(userId), data);
    return response.data;
  },

  // Reset user PIN (Super Admin)
  resetUserPIN: async (userId: string) => {
    const response = await api.post(API_ENDPOINTS.RESET_USER_PIN(userId));
    return response.data;
  },

  // Reset user password (Super Admin)
  resetUserPassword: async (userId: string) => {
    const response = await api.post(API_ENDPOINTS.RESET_USER_PASSWORD(userId));
    return response.data;
  },
};
