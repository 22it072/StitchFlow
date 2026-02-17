// frontend/src/services/companyApi.js
import api from './api';

export const companyApi = {
  // ─── Company CRUD Operations ───
  createCompany: (data) => 
    api.post('/companies', data),

  joinCompany: (companyCode) => 
    api.post('/companies/join', { companyCode }),

  getUserCompanies: () => 
    api.get('/companies'),

  getCompanyDetails: (companyId) => 
    api.get(`/companies/${companyId}`),

  updateCompany: (companyId, data) => 
    api.put(`/companies/${companyId}`, data),

  regenerateCode: (companyId) => 
    api.post(`/companies/${companyId}/regenerate-code`),

  leaveCompany: (companyId) => 
    api.post(`/companies/${companyId}/leave`),

  // ─── Delete company (Super Admin only) ───
  deleteCompany: async (companyId) => {
    const response = await api.delete(`/companies/${companyId}`);

    // Clean up localStorage after successful deletion
    const activeCompanyId = localStorage.getItem('activeCompanyId');
    if (activeCompanyId === companyId) {
      localStorage.removeItem('activeCompanyId');
      localStorage.removeItem('activeCompany');
    }

    return response;
  },

  // ─── User Management ───
  getCompanyUsers: (companyId, params) =>
    api.get(`/companies/${companyId}/users`, { params }),

  getUserStats: (companyId) =>
    api.get(`/companies/${companyId}/users/stats`),

  changeUserRole: (companyId, userId, role) =>
    api.put(`/companies/${companyId}/users/${userId}/role`, { role }),

  removeUser: (companyId, userId) =>
    api.delete(`/companies/${companyId}/users/${userId}`),

  transferOwnership: (companyId, newOwnerId) =>
    api.post(`/companies/${companyId}/transfer-ownership`, { newOwnerId }),
};

export default companyApi;