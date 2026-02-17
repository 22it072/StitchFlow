import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  User,
  Calculator,
  Palette,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  DollarSign,
  Calendar,
  Hash,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import IconSelect from '../components/common/IconSelect';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { settings, updateSettings, resetSettings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Calculation settings state
  const [calculationSettings, setCalculationSettings] = useState({
    defaultGstPercentage: 5,
    defaultWastage: 3,
    weightDecimalPrecision: 4,
    costDecimalPrecision: 2,
  });

  // Display settings state
  const [displaySettings, setDisplaySettings] = useState({
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light',
  });

  // Behavior settings state
  const [behaviorSettings, setBehaviorSettings] = useState({
    enableWeft2ByDefault: false,
    autoSaveInterval: 30,
  });

  // Initialize profile data from user
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  // Initialize settings from context
  useEffect(() => {
    setCalculationSettings({
      defaultGstPercentage: settings.defaultGstPercentage ?? 5,
      defaultWastage: settings.defaultWastage ?? 3,
      weightDecimalPrecision: settings.weightDecimalPrecision ?? 4,
      costDecimalPrecision: settings.costDecimalPrecision ?? 2,
    });

    setDisplaySettings({
      currencySymbol: settings.currencySymbol || '₹',
      dateFormat: settings.dateFormat || 'DD/MM/YYYY',
      theme: settings.theme || 'light',
    });

    setBehaviorSettings({
      enableWeft2ByDefault: settings.enableWeft2ByDefault ?? false,
      autoSaveInterval: settings.autoSaveInterval ?? 30,
    });
  }, [settings]);

  // Handlers (same as before)
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleCalculationChange = (e) => {
    const { name, value } = e.target;
    setCalculationSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleDisplayChange = (e) => {
    const { name, value } = e.target;
    setDisplaySettings(prev => ({ ...prev, [name]: value }));
  };

  const handleBehaviorChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBehaviorSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Submit handlers (same as before)
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const updateData = {
      name: profileData.name,
      email: profileData.email,
      company: profileData.company,
      phone: profileData.phone,
    };
    if (profileData.newPassword) {
      updateData.password = profileData.newPassword;
    }
    const success = await updateProfile(updateData);
    if (success) {
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      toast.success('Profile updated successfully');
    }
    setLoading(false);
  };

  const handleCalculationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    const dataToSave = {
      defaultGstPercentage: parseFloat(calculationSettings.defaultGstPercentage) || 5,
      defaultWastage: parseFloat(calculationSettings.defaultWastage) || 3,
      weightDecimalPrecision: parseInt(calculationSettings.weightDecimalPrecision) || 4,
      costDecimalPrecision: parseInt(calculationSettings.costDecimalPrecision) || 2,
    };
    const result = await updateSettings(dataToSave);
    if (result.success) {
      setSaveSuccess(true);
      toast.success('Calculation settings saved!');
      await refreshSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      toast.error('Failed to save settings');
    }
    setLoading(false);
  };

  const handleDisplaySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateSettings(displaySettings);
    if (result.success) {
      toast.success('Display settings saved!');
      await refreshSettings();
    } else {
      toast.error('Failed to save settings');
    }
    setLoading(false);
  };

  const handleBehaviorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateSettings({
      enableWeft2ByDefault: behaviorSettings.enableWeft2ByDefault,
      autoSaveInterval: parseInt(behaviorSettings.autoSaveInterval) || 30,
    });
    if (result.success) {
      toast.success('Behavior settings saved!');
      await refreshSettings();
    } else {
      toast.error('Failed to save settings');
    }
    setLoading(false);
  };

  const handleResetSettings = async () => {
    if (!window.confirm('Reset all settings to default values?')) return;
    setLoading(true);
    const result = await resetSettings();
    if (result.success) {
      toast.success('Settings reset to defaults');
      await refreshSettings();
    }
    setLoading(false);
  };

  // Dropdown Options with Icons
  const currencyOptions = [
    { value: '₹', label: 'Indian Rupee', icon: '₹', description: 'INR - India', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { value: '$', label: 'US Dollar', icon: '$', description: 'USD - United States', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { value: '€', label: 'Euro', icon: '€', description: 'EUR - European Union', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { value: '£', label: 'British Pound', icon: '£', description: 'GBP - United Kingdom', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { value: '¥', label: 'Japanese Yen', icon: '¥', description: 'JPY - Japan', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
    { value: 'AED', label: 'UAE Dirham', icon: 'د.إ', description: 'AED - United Arab Emirates', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  ];

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', icon: Calendar, description: 'Example: 31/12/2024', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', icon: Calendar, description: 'Example: 12/31/2024', iconBg: 'bg-pink-100', iconColor: 'text-pink-600' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', icon: Calendar, description: 'Example: 2024-12-31', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
  ];

  const themeOptions = [
    { value: 'light', label: 'Light Mode', icon: Sun, description: 'Bright and clean interface', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    { value: 'dark', label: 'Dark Mode', icon: Moon, description: 'Easy on the eyes', iconBg: 'bg-gray-800', iconColor: 'text-gray-200' },
    { value: 'system', label: 'System Default', icon: Monitor, description: 'Match system preference', iconBg: 'bg-gray-100', iconColor: 'text-gray-600' },
  ];

  const precisionOptions = [
    { value: '1', label: '1 Decimal', icon: Hash, description: 'Example: 5.6', iconBg: 'bg-gray-100' },
    { value: '2', label: '2 Decimals', icon: Hash, description: 'Example: 5.67', iconBg: 'bg-gray-100' },
    { value: '3', label: '3 Decimals', icon: Hash, description: 'Example: 5.672', iconBg: 'bg-gray-100' },
    { value: '4', label: '4 Decimals', icon: Hash, description: 'Example: 5.6726', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { value: '5', label: '5 Decimals', icon: Hash, description: 'Example: 5.67265', iconBg: 'bg-gray-100' },
    { value: '6', label: '6 Decimals', icon: Hash, description: 'Example: 5.672653', iconBg: 'bg-gray-100' },
  ];

  const costPrecisionOptions = [
    { value: '1', label: '1 Decimal', description: 'Example: ₹4.0' },
    { value: '2', label: '2 Decimals', description: 'Example: ₹4.05' },
    { value: '3', label: '3 Decimals', description: 'Example: ₹4.052' },
    { value: '4', label: '4 Decimals', description: 'Example: ₹4.0523' },
  ];

  const autoSaveOptions = [
    { value: '15', label: '15 seconds', description: 'Very frequent saving' },
    { value: '30', label: '30 seconds', description: 'Recommended' },
    { value: '60', label: '1 minute', description: 'Moderate frequency' },
    { value: '120', label: '2 minutes', description: 'Less frequent' },
    { value: '300', label: '5 minutes', description: 'Minimal saving' },
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'calculation', label: 'Calculation', icon: Calculator },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'behavior', label: 'Behavior', icon: Clock },
  ];

  const isMissingWastage = settings.defaultWastage === undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and preferences</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={refreshSettings}>
          Refresh
        </Button>
      </div>

      {isMissingWastage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Settings Update Required</h4>
            <p className="text-sm text-yellow-700 mt-1">
              New settings fields available. Save Calculation Settings to update.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card padding="p-4" className="lg:col-span-1 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="danger"
              size="sm"
              fullWidth
              icon={RefreshCw}
              onClick={handleResetSettings}
            >
              Reset All to Defaults
            </Button>
          </div>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" name="name" value={profileData.name} onChange={handleProfileChange} required />
                  <Input label="Email" name="email" type="email" value={profileData.email} onChange={handleProfileChange} required />
                  <Input label="Company" name="company" value={profileData.company} onChange={handleProfileChange} />
                  <Input label="Phone" name="phone" value={profileData.phone} onChange={handleProfileChange} />
                </div>
                <hr />
                <h3 className="text-md font-medium text-gray-900">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Current Password" name="currentPassword" type="password" value={profileData.currentPassword} onChange={handleProfileChange} />
                  <Input label="New Password" name="newPassword" type="password" value={profileData.newPassword} onChange={handleProfileChange} />
                  <Input label="Confirm Password" name="confirmPassword" type="password" value={profileData.confirmPassword} onChange={handleProfileChange} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" icon={Save} loading={loading}>Save Profile</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Calculation Tab */}
          {activeTab === 'calculation' && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Calculation Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">Configure default values</p>
                </div>
                {saveSuccess && (
                  <div className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-1.5 rounded-full">
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Saved!
                  </div>
                )}
              </div>

              <form onSubmit={handleCalculationSubmit} className="space-y-6">
                {/* Default Values */}
                <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                  <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-indigo-600" />
                    Default Values
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default GST (%)</label>
                      <input
                        type="number"
                        name="defaultGstPercentage"
                        step="0.01"
                        min="0"
                        max="100"
                        value={calculationSettings.defaultGstPercentage}
                        onChange={handleCalculationChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-lg font-medium"
                      />
                      <p className="text-xs text-gray-500 mt-2">Auto-applied to new yarns</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Wastage (%)</label>
                      <input
                        type="number"
                        name="defaultWastage"
                        step="0.01"
                        min="0"
                        max="100"
                        value={calculationSettings.defaultWastage}
                        onChange={handleCalculationChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-lg font-medium"
                      />
                      <p className="text-xs text-gray-500 mt-2">Auto-applied in new estimates</p>
                    </div>
                  </div>
                </div>

                {/* Decimal Precision */}
                <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Decimal Precision</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <IconSelect
                      label="Weight Decimal Precision"
                      name="weightDecimalPrecision"
                      value={calculationSettings.weightDecimalPrecision.toString()}
                      onChange={handleCalculationChange}
                      options={precisionOptions}
                      placeholder="Select precision"
                    />
                    <Select
                      label="Cost Decimal Precision"
                      name="costDecimalPrecision"
                      value={calculationSettings.costDecimalPrecision.toString()}
                      onChange={handleCalculationChange}
                      options={costPrecisionOptions}
                      placeholder="Select precision"
                    />
                  </div>
                </div>

                {/* Current Values */}
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <h4 className="text-sm font-semibold text-indigo-900 mb-4">📊 Current Saved Values</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="text-indigo-600 block text-xs font-medium">GST</span>
                      <span className="font-bold text-indigo-900 text-2xl">{settings.defaultGstPercentage ?? '-'}%</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="text-indigo-600 block text-xs font-medium">Wastage</span>
                      <span className="font-bold text-indigo-900 text-2xl">{settings.defaultWastage ?? '-'}%</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="text-indigo-600 block text-xs font-medium">Weight Decimals</span>
                      <span className="font-bold text-indigo-900 text-2xl">{settings.weightDecimalPrecision ?? '-'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="text-indigo-600 block text-xs font-medium">Cost Decimals</span>
                      <span className="font-bold text-indigo-900 text-2xl">{settings.costDecimalPrecision ?? '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" icon={Save} loading={loading}>
                    Save Calculation Settings
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Display Settings</h2>

              <form onSubmit={handleDisplaySubmit} className="space-y-6">
                <div className="space-y-5">
                  <IconSelect
                    label="Currency"
                    name="currencySymbol"
                    value={displaySettings.currencySymbol}
                    onChange={handleDisplayChange}
                    options={currencyOptions}
                    placeholder="Select currency"
                  />

                  <IconSelect
                    label="Date Format"
                    name="dateFormat"
                    value={displaySettings.dateFormat}
                    onChange={handleDisplayChange}
                    options={dateFormatOptions}
                    placeholder="Select date format"
                  />

                  <IconSelect
                    label="Theme"
                    name="theme"
                    value={displaySettings.theme}
                    onChange={handleDisplayChange}
                    options={themeOptions}
                    placeholder="Select theme"
                  />
                </div>

                {/* Current Values */}
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <h4 className="text-sm font-semibold text-indigo-900 mb-4">📊 Current Saved Values</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                      <span className="text-4xl">{settings.currencySymbol}</span>
                      <span className="block text-xs text-gray-500 mt-1">Currency</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                      <span className="font-mono text-lg">{settings.dateFormat}</span>
                      <span className="block text-xs text-gray-500 mt-1">Date Format</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                      <span className="capitalize font-medium">{settings.theme}</span>
                      <span className="block text-xs text-gray-500 mt-1">Theme</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" icon={Save} loading={loading}>
                    Save Display Settings
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Behavior Tab */}
          {activeTab === 'behavior' && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Behavior Settings</h2>

              <form onSubmit={handleBehaviorSubmit} className="space-y-6">
                {/* Auto-save */}
                <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                  <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                    Auto-Save
                  </h3>
                  <Select
                    label="Auto-save Interval"
                    name="autoSaveInterval"
                    value={behaviorSettings.autoSaveInterval.toString()}
                    onChange={handleBehaviorChange}
                    options={autoSaveOptions}
                    placeholder="Select interval"
                  />
                </div>

                {/* Default Options */}
                <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Default Options</h3>
                  <label className="flex items-start space-x-4 cursor-pointer p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        name="enableWeft2ByDefault"
                        checked={behaviorSettings.enableWeft2ByDefault}
                        onChange={handleBehaviorChange}
                        className="sr-only"
                      />
                      <div className={`w-12 h-7 rounded-full transition-colors ${behaviorSettings.enableWeft2ByDefault ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${behaviorSettings.enableWeft2ByDefault ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900 block">Enable Weft-2 by default</span>
                      <span className="text-xs text-gray-500 mt-1 block">Automatically enable Weft-2 section in new estimates</span>
                    </div>
                  </label>
                </div>

                {/* Current Values */}
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <h4 className="text-sm font-semibold text-indigo-900 mb-4">📊 Current Saved Values</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="text-indigo-600 block text-xs font-medium">Auto-save</span>
                      <span className="font-bold text-indigo-900 text-xl">{settings.autoSaveInterval}s</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="text-indigo-600 block text-xs font-medium">Weft-2 Default</span>
                      <span className={`font-bold text-xl ${settings.enableWeft2ByDefault ? 'text-green-600' : 'text-gray-400'}`}>
                        {settings.enableWeft2ByDefault ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" icon={Save} loading={loading}>
                    Save Behavior Settings
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;