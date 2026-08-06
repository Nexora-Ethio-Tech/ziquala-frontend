import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  // Do not set a global Content-Type so FormData requests can set their own boundary
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ziquala_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try refresh token
    // But skip this entirely for auth endpoints — a 401 from /auth/login means wrong credentials,
    // not an expired session. Trying to refresh there causes an infinite redirect loop.
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh-token') ||
      originalRequest.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('ziquala_refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('ziquala_token', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear session and redirect to login
        localStorage.removeItem('ziquala_token');
        localStorage.removeItem('ziquala_refresh_token');
        localStorage.removeItem('ziquala_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    const serverReason =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;

    if (serverReason && typeof serverReason === 'string') {
      error.message = serverReason;
    }

    return Promise.reject(error);
  }
);

export default api;
