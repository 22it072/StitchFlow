// frontend/src/pages/CompanySettings.jsx
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Shield,
  Save,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { usePermissions } from '../hooks/usePermissions';
import { AccessDenied } from '../components/guards/PermissionGuard';
import JoinCodeDisplay from '../components/company/JoinCodeDisplay';
import { companyApi } from '../services/companyApi';   // ← use companyApi
import toast from 'react-hot-toast';

const CompanySettings = () => {
  const navigate = useNavigate();
  const { activeCompany, setActiveCompany, fetchCompanies } = useCompany();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [companyData, setCompanyData] = useState({
    name: '',
    description: '',
    companyCode: '',
  });
  const [settings, setSettings] = useState({
    defaultRole: 'viewer',
    allowJoinViaCode: true,
    maxUsers: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!hasPermission('company:settings')) {
    return (
      <AccessDenied message="You don't have permission to access company settings" />
    );
  }

  useEffect(() => {
    if (activeCompany?._id) {
      fetchCompanyDetails();
    }
  }, [activeCompany?._id]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const response = await companyApi.getCompanyDetails(activeCompany._id);
      const data = response.data.data;
      setCompanyData({
        name: data.name,
        description: data.description || '',
        companyCode: data.companyCode || '',
      });
      setSettings(
        data.settings || {
          defaultRole: 'viewer',
          allowJoinViaCode: true,
          maxUsers: 50,
        }
      );
    } catch (err) {
      toast.error('Failed to fetch company details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyData.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setSaving(true);
    try {
      await companyApi.updateCompany(activeCompany._id, {
        name: companyData.name.trim(),
        description: companyData.description.trim(),
        settings,
      });
      toast.success('Company settings saved successfully');
      await fetchCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can delete a company');
      return;
    }

    const confirmText = prompt(
      `⚠️ This will permanently delete "${activeCompany.name}" and ALL its data.\n\nType "${activeCompany.name}" to confirm:`
    );

    // User pressed Cancel
    if (confirmText === null) return;

    if (confirmText !== activeCompany.name) {
      toast.error('Company name did not match. Deletion cancelled.');
      return;
    }

    setDeleting(true);
    try {
      // ─── Call the API to delete ───
      await companyApi.deleteCompany(activeCompany._id);

      // ─── Clear active company from context ───
      if (setActiveCompany) {
        setActiveCompany(null);
      }

      // ─── Refresh company list (deleted company will be gone) ───
      await fetchCompanies();

      toast.success('Company deleted successfully');

      // ─── Navigate away ───
      navigate('/companies/join', { replace: true });
    } catch (err) {
      console.error('Delete company error:', err);
      const message =
        err.response?.data?.message || 'Failed to delete company';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveCompany = async () => {
    if (isSuperAdmin) {
      toast.error(
        'Super Admin cannot leave. Transfer ownership first or delete the company.'
      );
      return;
    }

    if (!window.confirm('Are you sure you want to leave this company?')) {
      return;
    }

    try {
      await companyApi.leaveCompany(activeCompany._id);

      if (setActiveCompany) {
        setActiveCompany(null);
      }
      localStorage.removeItem('activeCompanyId');
      localStorage.removeItem('activeCompany');

      await fetchCompanies();
      toast.success('You have left the company');
      navigate('/companies/join', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave company');
    }
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-600" />
            Company Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your company configuration
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-500" />
          Basic Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyData.name}
              onChange={(e) =>
                setCompanyData({ ...companyData, name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 
                rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={companyData.description}
              onChange={(e) =>
                setCompanyData({ ...companyData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 
                rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white text-gray-900 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Join Code */}
      {companyData.companyCode && (
        <JoinCodeDisplay
          companyCode={companyData.companyCode}
          companyId={activeCompany._id}
          onCodeRegenerated={(newCode) =>
            setCompanyData({ ...companyData, companyCode: newCode })
          }
        />
      )}

      {/* Access Settings */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-500" />
          Access Settings
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Allow Join via Code</p>
              <p className="text-sm text-gray-500">
                Let users join using the company code
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowJoinViaCode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allowJoinViaCode: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                peer-focus:ring-blue-300 rounded-full peer 
                peer-checked:after:translate-x-full peer-checked:after:border-white 
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white 
                after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                after:transition-all peer-checked:bg-blue-600"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Role for New Members
            </label>
            <select
              value={settings.defaultRole}
              onChange={(e) =>
                setSettings({ ...settings, defaultRole: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 
                rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white text-gray-900"
            >
              <option value="viewer">Viewer (View Only)</option>
              <option value="editor">Editor (View, Create, Edit)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Users
            </label>
            <input
              type="number"
              value={settings.maxUsers}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxUsers: parseInt(e.target.value) || 1,
                })
              }
              min={1}
              max={1000}
              className="w-full px-4 py-3 border border-gray-300 
                rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 
            disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Changes
        </button>
      </div>

      {/* ─── Danger Zone ─── */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h2>

        <div className="space-y-4">
          {/* Leave Company — hidden for super_admin */}
          {!isSuperAdmin && (
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Leave Company</p>
                <p className="text-sm text-gray-500">
                  Remove yourself from this company
                </p>
              </div>
              <button
                onClick={handleLeaveCompany}
                className="px-4 py-2 text-red-600 hover:bg-red-100 
                  rounded-lg transition-colors font-medium"
              >
                Leave
              </button>
            </div>
          )}

          {/* Delete Company — super_admin ONLY */}
          {isSuperAdmin && (
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-300">
              <div>
                <p className="font-medium text-red-700">Delete Company</p>
                <p className="text-sm text-gray-500">
                  Permanently delete{' '}
                  <span className="font-semibold">"{activeCompany?.name}"</span>{' '}
                  and all its data including estimates, yarns, and productions.
                </p>
                <p className="text-xs text-red-500 mt-1 font-medium">
                  ⚠️ This action cannot be undone
                </p>
              </div>
              <button
                onClick={handleDeleteCompany}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700
                  disabled:bg-red-400 text-white rounded-lg transition-colors 
                  min-w-[110px] justify-center font-medium"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          )}

          {/* Info for super_admin about leaving */}
          {isSuperAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> As Super Admin, you cannot leave the
                company. To step down, transfer ownership to another admin
                first, or delete the company entirely.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;