// frontend/src/services/weavingApi.js (FIXED)
import api from './api';

// Helper function to get company ID from localStorage
const getCompanyId = () => localStorage.getItem('activeCompanyId');

// ============ WEAVING ANALYTICS API ============
export const weavingAPI = {
  getDashboard: (companyId = getCompanyId()) =>
    api.get('/weaving/analytics/dashboard', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
};

// ============ LOOM API ============
export const loomAPI = {
  getAll: (params, companyId = getCompanyId()) =>
    api.get('/weaving/looms', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getOne: (id, companyId = getCompanyId()) =>
    api.get(`/weaving/looms/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  create: (data, companyId = getCompanyId()) =>
    api.post('/weaving/looms', data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  update: (id, data, companyId = getCompanyId()) =>
    api.put(`/weaving/looms/${id}`, data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  updateStatus: (id, status, companyId = getCompanyId()) =>
    api.put(
      `/weaving/looms/${id}/status`,
      { status },
      {
        headers: companyId ? { 'X-Company-Id': companyId } : {},
      }
    ),
  delete: (id, companyId = getCompanyId()) =>
    api.delete(`/weaving/looms/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getStats: (companyId = getCompanyId()) =>
    api.get('/weaving/looms/stats', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getAvailable: (companyId = getCompanyId()) =>
    api.get('/weaving/looms/available', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
};

// ============ BEAM API ============
export const beamAPI = {
  getAll: (params, companyId = getCompanyId()) =>
    api.get('/weaving/beams', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getOne: (id, companyId = getCompanyId()) =>
    api.get(`/weaving/beams/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  create: (data, companyId = getCompanyId()) =>
    api.post('/weaving/beams', data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  update: (id, data, companyId = getCompanyId()) =>
    api.put(`/weaving/beams/${id}`, data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  updateRemaining: (id, remainingLength, companyId = getCompanyId()) =>
    api.put(
      `/weaving/beams/${id}/remaining`,
      { remainingLength },
      {
        headers: companyId ? { 'X-Company-Id': companyId } : {},
      }
    ),
  delete: (id, companyId = getCompanyId()) =>
    api.delete(`/weaving/beams/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getStats: (companyId = getCompanyId()) =>
    api.get('/weaving/beams/stats', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getAvailable: (companyId = getCompanyId()) =>
    api.get('/weaving/beams/available', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
};

// ============ WEAVING SET API ============
export const weavingSetAPI = {
  getAll: (params, companyId = getCompanyId()) =>
    api.get('/weaving/sets', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getOne: (id, companyId = getCompanyId()) =>
    api.get(`/weaving/sets/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  create: (data, companyId = getCompanyId()) =>
    api.post('/weaving/sets', data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  update: (id, data, companyId = getCompanyId()) =>
    api.put(`/weaving/sets/${id}`, data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  updateStatus: (id, status, companyId = getCompanyId()) =>
    api.put(
      `/weaving/sets/${id}/status`,
      { status },
      {
        headers: companyId ? { 'X-Company-Id': companyId } : {},
      }
    ),
  delete: (id, companyId = getCompanyId()) =>
    api.delete(`/weaving/sets/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getStats: (companyId = getCompanyId()) =>
    api.get('/weaving/sets/stats', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
};

// ============ WEAVING PRODUCTION API ============
export const weavingProductionAPI = {
  getAll: (params, companyId = getCompanyId()) =>
    api.get('/weaving/production', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getOne: (id, companyId = getCompanyId()) =>
    api.get(`/weaving/production/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  create: (data, companyId = getCompanyId()) =>
    api.post('/weaving/production', data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  update: (id, data, companyId = getCompanyId()) =>
    api.put(`/weaving/production/${id}`, data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  delete: (id, companyId = getCompanyId()) =>
    api.delete(`/weaving/production/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getStats: (companyId = getCompanyId()) =>
    api.get('/weaving/production/stats', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getTodaySummary: (companyId = getCompanyId()) =>
    api.get('/weaving/production/today', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
};

// ============ MAINTENANCE API ============
export const maintenanceAPI = {
  getAll: (params, companyId = getCompanyId()) =>
    api.get('/weaving/maintenance', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getOne: (id, companyId = getCompanyId()) =>
    api.get(`/weaving/maintenance/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  create: (data, companyId = getCompanyId()) =>
    api.post('/weaving/maintenance', data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  update: (id, data, companyId = getCompanyId()) =>
    api.put(`/weaving/maintenance/${id}`, data, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  updateStatus: (id, status, companyId = getCompanyId()) =>
    api.put(
      `/weaving/maintenance/${id}/status`,
      { status },
      {
        headers: companyId ? { 'X-Company-Id': companyId } : {},
      }
    ),
  delete: (id, companyId = getCompanyId()) =>
    api.delete(`/weaving/maintenance/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getStats: (companyId = getCompanyId()) =>
    api.get('/weaving/maintenance/stats', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getAlerts: (companyId = getCompanyId()) =>
    api.get('/weaving/maintenance/alerts', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
};

// ============ WEAVING ANALYTICS API (Extended) ============
export const weavingAnalyticsAPI = {
  getDashboard: (companyId = getCompanyId()) =>
    api.get('/weaving/analytics/dashboard', {
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getLoomStatus: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/loom-status', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getProductionTrend: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/production-trend', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getLoomEfficiency: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/loom-efficiency', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getShiftProduction: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/shift-production', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getDefectTrend: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/defect-trend', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getTopLooms: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/top-looms', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getOrderCompletion: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/order-completion', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getBeamConsumption: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/beam-consumption', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
  getMaintenanceCost: (params, companyId = getCompanyId()) =>
    api.get('/weaving/analytics/maintenance-cost', {
      params,
      headers: companyId ? { 'X-Company-Id': companyId } : {},
    }),
};