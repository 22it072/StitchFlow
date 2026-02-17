import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

const defaultSettings = {
  // Calculation Settings
  defaultGstPercentage: 5,
  defaultWastage: 10,
  weightDecimalPrecision: 4,
  costDecimalPrecision: 2,
  // Behavior Settings
  enableWeft2ByDefault: false,
  autoSaveInterval: 30,
  // Display Settings
  currencySymbol: '₹',
  currencyCode: 'INR',
  dateFormat: 'DD/MM/YYYY',
  theme: 'light',
};

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get('/settings');
      // Merge with defaults to ensure all fields exist
      const mergedSettings = { ...defaultSettings };
      
      // Only copy valid fields from response
      Object.keys(defaultSettings).forEach(key => {
        if (response.data[key] !== undefined && response.data[key] !== null) {
          mergedSettings[key] = response.data[key];
        }
      });
      
      setSettings(mergedSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings) => {
    try {
      console.log('Sending settings to API:', newSettings); // Debug log
      
      const response = await api.put('/settings', newSettings);
      
      console.log('Received from API:', response.data); // Debug log
      
      // Merge response with defaults
      const mergedSettings = { ...defaultSettings };
      Object.keys(defaultSettings).forEach(key => {
        if (response.data[key] !== undefined && response.data[key] !== null) {
          mergedSettings[key] = response.data[key];
        }
      });
      
      console.log('Merged settings:', mergedSettings); // Debug log
      
      setSettings(mergedSettings);
      return { success: true, data: mergedSettings };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: error.message };
    }
  };

  const resetSettings = async () => {
    try {
      const response = await api.post('/settings/reset');
      
      const mergedSettings = { ...defaultSettings };
      Object.keys(defaultSettings).forEach(key => {
        if (response.data[key] !== undefined && response.data[key] !== null) {
          mergedSettings[key] = response.data[key];
        }
      });
      
      setSettings(mergedSettings);
      return { success: true, data: mergedSettings };
    } catch (error) {
      console.error('Error resetting settings:', error);
      return { success: false, error: error.message };
    }
  };

  // Force refresh settings
  const refreshSettings = () => {
    fetchSettings();
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        resetSettings,
        refreshSettings,
        defaultSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};