// frontend/src/services/apiHelpers.js

/**
 * Returns headers object with X-Company-Id if companyId is provided.
 * Falls back to localStorage if no companyId given.
 */
export const companyHeaders = (companyId) => {
  const id = companyId || localStorage.getItem('activeCompanyId');
  if (!id) return {};
  return { 'X-Company-Id': id };
};

/**
 * Merges company header into an existing axios config object.
 */
export const withCompany = (companyId, config = {}) => {
  const id = companyId || localStorage.getItem('activeCompanyId');
  if (!id) return config;
  
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      'X-Company-Id': id,
    },
  };
};