// frontend/src/context/CompanyContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CompanyContext = createContext(null);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies');
      const companiesData = response.data.data || [];
      setCompanies(companiesData);

      const savedCompanyId = localStorage.getItem('activeCompanyId');
      const savedCompany = companiesData.find(c => c._id === savedCompanyId);
      
      if (savedCompany) {
        activateCompany(savedCompany);
      } else if (companiesData.length > 0) {
        activateCompany(companiesData[0]);
      } else {
        // No companies at all
        setActiveCompany(null);
        setUserRole(null);
        localStorage.removeItem('activeCompanyId');
        delete api.defaults.headers.common['X-Company-Id'];
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Internal helper - sets company state + localStorage + API header
  const activateCompany = useCallback((company) => {
    setActiveCompany(company);
    setUserRole(company.role);
    localStorage.setItem('activeCompanyId', company._id);
    api.defaults.headers.common['X-Company-Id'] = company._id;
    
    console.log(`[CompanyContext] Activated company: ${company.name} (${company._id})`);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Switch active company (user-triggered)
  const switchCompany = useCallback((company) => {
    // Clear the default header first to ensure clean switch
    delete api.defaults.headers.common['X-Company-Id'];
    
    activateCompany(company);
    toast.success(`Switched to ${company.name}`);
  }, [activateCompany]);

  // Create new company
  const createCompany = useCallback(async (companyData) => {
    try {
      const response = await api.post('/companies', companyData);
      const newCompany = {
        ...response.data.data.company,
        role: response.data.data.role
      };
      
      setCompanies(prev => [...prev, newCompany]);
      switchCompany(newCompany);
      
      toast.success('Company created successfully!');
      return newCompany;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create company');
      throw err;
    }
  }, [switchCompany]);

  // Join company via code
  const joinCompany = useCallback(async (companyCode) => {
    try {
      const response = await api.post('/companies/join', { companyCode });
      const joinedCompany = {
        ...response.data.data.company,
        role: response.data.data.role
      };
      
      setCompanies(prev => [...prev, joinedCompany]);
      switchCompany(joinedCompany);
      
      toast.success(`Joined ${joinedCompany.name} successfully!`);
      return joinedCompany;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join company');
      throw err;
    }
  }, [switchCompany]);

  // Leave company
  const leaveCompany = useCallback(async (companyId) => {
    try {
      await api.post(`/companies/${companyId}/leave`);
      
      const updatedCompanies = companies.filter(c => c._id !== companyId);
      setCompanies(updatedCompanies);
      
      if (activeCompany?._id === companyId) {
        if (updatedCompanies.length > 0) {
          switchCompany(updatedCompanies[0]);
        } else {
          setActiveCompany(null);
          setUserRole(null);
          localStorage.removeItem('activeCompanyId');
          delete api.defaults.headers.common['X-Company-Id'];
        }
      }
      
      toast.success('Left company successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave company');
      throw err;
    }
  }, [activeCompany, companies, switchCompany]);

  const value = {
    companies,
    activeCompany,
    userRole,
    loading,
    error,
    fetchCompanies,
    switchCompany,
    createCompany,
    joinCompany,
    leaveCompany,
    hasCompany: companies.length > 0
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export default CompanyContext;