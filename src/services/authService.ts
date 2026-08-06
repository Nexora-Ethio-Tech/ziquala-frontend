import api from './api';
import { API_ENDPOINTS } from '../config/api';

export const authService = {
  // Login
  login: async (email: string, password: string) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, { email, password });
    const { accessToken, refreshToken, user } = response.data.data;
    
    localStorage.setItem('ziquala_token', accessToken);
    localStorage.setItem('ziquala_refresh_token', refreshToken);
    localStorage.setItem('ziquala_user', JSON.stringify(user));
    
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await api.post(API_ENDPOINTS.LOGOUT);
    } finally {
      localStorage.removeItem('ziquala_token');
      localStorage.removeItem('ziquala_refresh_token');
      localStorage.removeItem('ziquala_user');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get(API_ENDPOINTS.ME);
    return response.data.data;
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('ziquala_user');
    return user ? JSON.parse(user) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('ziquala_token');
  },
};
