import api from './api';
import { API_ENDPOINTS } from '../config/api';

const getRole = (): string | null => {
  try {
    const userJson = localStorage.getItem('ziquala_user');
    return userJson ? JSON.parse(userJson).role : null;
  } catch {
    return null;
  }
};

export const userService = {
  // Create School Admin
  createSchoolAdmin: async (data: { name: string; email: string; branchId: string; password?: string; profileImage?: string }) => {
    const response = await api.post(API_ENDPOINTS.CREATE_SCHOOL_ADMIN, data);
    return response.data;
  },

  // Create Vice Principal
  createVicePrincipal: async (data: { name: string; email: string; branchId: string }) => {
    const response = await api.post(API_ENDPOINTS.CREATE_VICE_PRINCIPAL, data);
    return response.data;
  },

  createAcademicManager: async (data: { name: string; email: string; branchId: string }) => {
    const response = await api.post(API_ENDPOINTS.CREATE_ACADEMIC_MANAGER, data);
    return response.data;
  },

  createStorekeeper: async (data: { name: string; email: string; branchId: string; password?: string }) => {
    const response = await api.post('/super-admin/create-storekeeper', data);
    return response.data;
  },

  // Get all users
  getAllUsers: async (filters: { role?: string; status?: string; branchId?: string } = {}) => {
    const role = getRole();
    const isSuperAdmin = role === 'super-admin';
    const endpoint = isSuperAdmin ? API_ENDPOINTS.GET_ALL_USERS : API_ENDPOINTS.GET_BRANCH_USERS;
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    const response = await api.get(`${endpoint}?${params}`);
    return response.data;
  },

  getAllUsersGuest: async (filters: { role?: string; status?: string; branchId?: string } = {}) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    const response = await api.get(`/guest/users?${params}`);
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    const role = getRole();
    const endpoint = role === 'super-admin' ? API_ENDPOINTS.GET_USER(userId) : API_ENDPOINTS.GET_BRANCH_USER(userId);
    const response = await api.get(endpoint);
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId: string, status: 'Approved' | 'Pending' | 'Revoked' | 'Active' | string) => {
    const role = getRole();
    const endpoint = role === 'super-admin'
      ? API_ENDPOINTS.UPDATE_USER_STATUS(userId)
      : `/school-admin/users/${userId}/status`;
    const response = await api.post(endpoint, { status });
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string) => {
    const role = getRole();
    const endpoint = role === 'super-admin'
      ? API_ENDPOINTS.DELETE_USER(userId)
      : API_ENDPOINTS.DELETE_BRANCH_USER(userId);
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

  // Update user details
  updateUser: async (userId: string, data: { name?: string; email?: string }) => {
    const role = getRole();
    const endpoint = role === 'super-admin'
      ? API_ENDPOINTS.UPDATE_USER(userId)
      : `/school-admin/users/${userId}`;
    const response = await api.post(endpoint, data);
    return response.data;
  },

  // Reset user PIN
  resetUserPIN: async (userId: string) => {
    const role = getRole();
    const endpoint = role === 'super-admin'
      ? API_ENDPOINTS.RESET_USER_PIN(userId)
      : `/school-admin/users/${userId}/reset-pin`;
    const response = await api.post(endpoint);
    return response.data;
  },

  // Reset user password (Super Admin)
  resetUserPassword: async (userId: string) => {
    const response = await api.post(API_ENDPOINTS.RESET_USER_PASSWORD(userId));
    return response.data;
  },
};
