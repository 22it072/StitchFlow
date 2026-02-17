// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add company ID header if available
    const activeCompanyId = localStorage.getItem('activeCompanyId');
    if (activeCompanyId) {
      config.headers['X-Company-Id'] = activeCompanyId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('activeCompanyId');
      window.location.href = '/login';
    }
    
    // Handle forbidden (permission denied)
    if (error.response?.status === 403) {
      // You can add toast notification here if needed
      console.error('Permission denied:', error.response?.data?.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

// ============ AUTH API ============
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ============ COMPANY API ============ (NEW)
export const companyAPI = {
  // Company operations
  create: (data) => api.post('/companies', data),
  join: (companyCode) => api.post('/companies/join', { companyCode }),
  getAll: () => api.get('/companies'),
  getOne: (companyId) => api.get(`/companies/${companyId}`),
  update: (companyId, data) => api.put(`/companies/${companyId}`, data),
  regenerateCode: (companyId) => api.post(`/companies/${companyId}/regenerate-code`),
  leave: (companyId) => api.post(`/companies/${companyId}/leave`),
  delete: (companyId) => api.delete(`/companies/${companyId}`),
  
  // User management
  getUsers: (companyId, params) => api.get(`/companies/${companyId}/users`, { params }),
  getUserStats: (companyId) => api.get(`/companies/${companyId}/users/stats`),
  changeUserRole: (companyId, userId, role) => 
    api.put(`/companies/${companyId}/users/${userId}/role`, { role }),
  removeUser: (companyId, userId) => 
    api.delete(`/companies/${companyId}/users/${userId}`),
  transferOwnership: (companyId, newOwnerId) => 
    api.post(`/companies/${companyId}/transfer-ownership`, { newOwnerId }),
};

// ============ YARN API ============
export const yarnAPI = {
  getAll: (params, companyId) => api.get('/yarns', { 
    params,
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getOne: (id, companyId) => api.get(`/yarns/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  create: (data, companyId) => api.post('/yarns', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  update: (id, data, companyId) => api.put(`/yarns/${id}`, data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  delete: (id, companyId) => api.delete(`/yarns/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getStats: (companyId) => api.get('/yarns/stats', {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
};

// ============ ESTIMATE API ============
export const estimateAPI = {
  getAll: (params, companyId) => api.get('/estimates', { 
    params,
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getOne: (id, companyId) => api.get(`/estimates/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  create: (data, companyId) => api.post('/estimates', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  update: (id, data, companyId) => api.put(`/estimates/${id}`, data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  delete: (id, companyId) => api.delete(`/estimates/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  duplicate: (id, data, companyId) => api.post(`/estimates/${id}/duplicate`, data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  revert: (id, version, companyId) => api.post(`/estimates/${id}/revert/${version}`, {}, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  compare: (ids, companyId) => api.post('/estimates/compare', { estimateIds: ids }, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  calculate: (data, companyId) => api.post('/estimates/calculate', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  saveDraft: (data, companyId) => api.post('/estimates/draft', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getDraft: (companyId) => api.get('/estimates/draft', {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  deleteDraft: (companyId) => api.delete('/estimates/draft', {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
};

// ============ ANALYTICS API ============
export const analyticsAPI = {
  getDashboard: (companyId) => api.get('/analytics/dashboard', { 
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getYarnUsage: (companyId) => api.get('/analytics/yarn-usage', { 
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getCostTrends: (period, companyId) => api.get('/analytics/cost-trends', { 
    params: { period },
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
};

// ============ SETTINGS API ============
export const settingsAPI = {
  get: (companyId) => api.get('/settings', {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  update: (data, companyId) => api.put('/settings', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  reset: (companyId) => api.post('/settings/reset', {}, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
};

// ============ PRODUCTION API ============
export const productionAPI = {
  getAll: (params, companyId) => api.get('/productions', { 
    params,
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getOne: (id, companyId) => api.get(`/productions/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  create: (data, companyId) => api.post('/productions', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  update: (id, data, companyId) => api.put(`/productions/${id}`, data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  delete: (id, companyId) => api.delete(`/productions/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  calculate: (data, companyId) => api.post('/productions/calculate', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getStats: (companyId) => api.get('/productions/stats', {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getAnalytics: (params, companyId) => api.get('/productions/analytics', { 
    params,
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
};

export * from './weavingApi';
// Add to existing api.js

// ============ PARTY API ============
export const partyAPI = {
  getAll: (params, companyId) => api.get('/parties', { 
    params,
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getOne: (id, companyId) => api.get(`/parties/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  create: (data, companyId) => api.post('/parties', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  update: (id, data, companyId) => api.put(`/parties/${id}`, data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  delete: (id, companyId) => api.delete(`/parties/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getStats: (companyId) => api.get('/parties/stats', {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
};

// ============ CHALLAN API ============
export const challanAPI = {
  getAll: (params, companyId) => api.get('/challans', { 
    params,
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getOne: (id, companyId) => api.get(`/challans/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  create: (data, companyId) => api.post('/challans', data, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  updateStatus: (id, status, companyId) => api.put(`/challans/${id}/status`, { status }, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  recordPayment: (id, paymentData, companyId) => api.post(`/challans/${id}/payment`, paymentData, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  delete: (id, companyId) => api.delete(`/challans/${id}`, {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
  getStats: (companyId) => api.get('/challans/stats', {
    headers: companyId ? { 'X-Company-Id': companyId } : {} 
  }),
};