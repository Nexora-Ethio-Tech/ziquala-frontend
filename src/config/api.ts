const normalizeApiUrl = (rawUrl: string | undefined) => {
  if (!rawUrl || rawUrl === '') return '';
  let url = rawUrl.trim();
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = `https://${url}`;
  }
  return url;
};

const getApiBaseUrl = () => {
  const envUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
  if (!envUrl || envUrl.startsWith('/')) {
    return '/api';
  }
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const getApiHostUrl = () => {
  const envUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
  if (!envUrl || envUrl.startsWith('/')) {
    return '';
  }
  return envUrl;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_HOST_URL = getApiHostUrl();

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  REFRESH_TOKEN: '/auth/refresh-token',
  CHANGE_PASSWORD: '/auth/change-password',

  // Super Admin
  CREATE_SCHOOL_ADMIN: '/super-admin/create-school-admin',
  CREATE_ACADEMIC_MANAGER: '/super-admin/create-academic-manager',
  CREATE_VICE_PRINCIPAL: '/super-admin/create-vice-principal',
  GET_ALL_USERS: '/super-admin/users',
  GET_USER: (id: string) => `/super-admin/users/${id}`,
  UPDATE_USER: (id: string) => `/super-admin/users/${id}`,
  UPDATE_USER_STATUS: (id: string) => `/super-admin/users/${id}/status`,
  DELETE_USER: (id: string) => `/super-admin/users/${id}`,
  RESET_USER_PIN: (id: string) => `/super-admin/users/${id}/reset-pin`,
  RESET_USER_PASSWORD: (id: string) => `/super-admin/users/${id}/reset-password`,

  // School Admin
  REGISTER_USER: '/school-admin/register-user',
  GET_BRANCH_USERS: '/school-admin/users',
  GET_BRANCH_USER: (id: string) => `/school-admin/users/${id}`,
  DELETE_BRANCH_USER: (id: string) => `/school-admin/users/${id}`,
};
