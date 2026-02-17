// frontend/src/pages/LoomManagement.jsx - FIXED VERSION
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Power,
  PowerOff,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Filter,
  Download,
  RefreshCw,
  Factory,
  TrendingUp,
  Calendar,
  Gauge,
  BarChart3,
  User,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import StatusIndicator from '../components/weaving/StatusIndicator';
import { loomAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useCompany } from '../context/CompanyContext';
import toast from 'react-hot-toast';

const LoomManagement = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { activeCompany } = useCompany();
  
  const [looms, setLooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('number-asc');
  const [showModal, setShowModal] = useState(false);
  const [editingLoom, setEditingLoom] = useState(null);
  const [stats, setStats] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, loom: null });
  
  // FIXED: Form data now matches backend requirements
  const [formData, setFormData] = useState({
    loomType: 'Auto',  // Default to 'Auto' (matches model enum)
    loomMake: '',
    reedWidth: '',
    reedWidthUnit: 'inches',
    rpm: '',
    status: 'Idle',
    location: '',
    operatorAssigned: '',
    purchaseDate: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  // Loom type options (MUST match Loom.js model enum exactly!)
  const loomTypeOptions = [
    { value: 'Auto', label: 'Auto Loom' },
    { value: 'Semi-Auto', label: 'Semi-Auto Loom' },
    { value: 'Rapier', label: 'Rapier Loom' },
    { value: 'Air Jet', label: 'Air Jet Loom' },
    { value: 'Water Jet', label: 'Water Jet Loom' },
    { value: 'Projectile', label: 'Projectile Loom' },
  ];

  // Reed width unit options
  const reedWidthUnitOptions = [
    { value: 'inches', label: 'Inches' },
    { value: 'cm', label: 'Centimeters' },
  ];

  // Status options
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Idle', label: 'Idle' },
    { value: 'Under Maintenance', label: 'Under Maintenance' },
    { value: 'Breakdown', label: 'Breakdown' },
  ];

  useEffect(() => {
    fetchLooms();
    fetchStats();
  }, [activeCompany?._id]);

  const fetchLooms = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
      };
      const response = await loomAPI.getAll(params, activeCompany?._id);
      setLooms(response.data.looms || response.data);
    } catch (error) {
      console.error('Error fetching looms:', error);
      toast.error('Failed to load looms');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await loomAPI.getStats(activeCompany?._id);
      setStats(response.data.stats || response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLooms(), fetchStats()]);
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  // Filter and sort looms
  const filteredAndSortedLooms = useMemo(() => {
    let filtered = [...looms];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(loom =>
        loom.loomNumber?.toLowerCase().includes(search.toLowerCase()) ||
        loom.loomMake?.toLowerCase().includes(search.toLowerCase()) ||
        loom.location?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(loom => loom.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'number-asc':
        filtered.sort((a, b) => a.loomNumber?.localeCompare(b.loomNumber, undefined, { numeric: true }));
        break;
      case 'number-desc':
        filtered.sort((a, b) => b.loomNumber?.localeCompare(a.loomNumber, undefined, { numeric: true }));
        break;
      case 'width-high':
        filtered.sort((a, b) => b.reedWidth - a.reedWidth);
        break;
      case 'width-low':
        filtered.sort((a, b) => a.reedWidth - b.reedWidth);
        break;
      case 'rpm-high':
        filtered.sort((a, b) => b.rpm - a.rpm);
        break;
      case 'rpm-low':
        filtered.sort((a, b) => a.rpm - b.rpm);
        break;
      default:
        break;
    }

    return filtered;
  }, [looms, search, statusFilter, sortBy]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.loomType) {
      newErrors.loomType = 'Loom type is required';
    }

    const reedWidth = Number(formData.reedWidth);
    if (!formData.reedWidth || reedWidth <= 0 || isNaN(reedWidth)) {
      newErrors.reedWidth = 'Reed width must be a positive number';
    }

    const rpm = Number(formData.rpm);
    if (!formData.rpm || rpm <= 0 || isNaN(rpm)) {
      newErrors.rpm = 'RPM must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FIXED: handleSubmit now sends correct loom payload
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      // Build payload matching backend requirements
      const payload = {
        loomType: formData.loomType,
        reedWidth: Number(formData.reedWidth),
        reedWidthUnit: formData.reedWidthUnit,
        rpm: Number(formData.rpm),
      };

      // Optional fields
      if (formData.loomMake?.trim()) {
        payload.loomMake = formData.loomMake.trim();
      }

      if (formData.location?.trim()) {
        payload.location = formData.location.trim();
      }

      if (formData.operatorAssigned?.trim()) {
        payload.operatorAssigned = formData.operatorAssigned.trim();
      }

      if (formData.purchaseDate) {
        payload.purchaseDate = formData.purchaseDate;
      }

      if (formData.lastMaintenanceDate) {
        payload.lastMaintenanceDate = formData.lastMaintenanceDate;
      }

      if (formData.nextMaintenanceDate) {
        payload.nextMaintenanceDate = formData.nextMaintenanceDate;
      }

      if (formData.notes?.trim()) {
        payload.notes = formData.notes.trim();
      }

      // Only send status when updating
      if (editingLoom && formData.status) {
        payload.status = formData.status;
      }

      console.log('Submitting loom payload:', payload);

      if (editingLoom) {
        await loomAPI.update(editingLoom._id, payload, activeCompany?._id);
        toast.success('Loom updated successfully');
      } else {
        await loomAPI.create(payload, activeCompany?._id);
        toast.success('Loom created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchLooms();
      fetchStats();
    } catch (error) {
      console.error('Error saving loom:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save loom');
    }
  };

  const handleEdit = (loom) => {
    setEditingLoom(loom);
    setFormData({
      loomType: loom.loomType || 'Auto',  // Default to 'Auto'
      loomMake: loom.loomMake || '',
      reedWidth: loom.reedWidth || '',
      reedWidthUnit: loom.reedWidthUnit || 'inches',
      rpm: loom.rpm || '',
      status: loom.status || 'Idle',
      location: loom.location || '',
      operatorAssigned: loom.operatorAssigned || '',
      purchaseDate: loom.purchaseDate ? new Date(loom.purchaseDate).toISOString().split('T')[0] : '',
      lastMaintenanceDate: loom.lastMaintenanceDate ? new Date(loom.lastMaintenanceDate).toISOString().split('T')[0] : '',
      nextMaintenanceDate: loom.nextMaintenanceDate ? new Date(loom.nextMaintenanceDate).toISOString().split('T')[0] : '',
      notes: loom.notes || '',
    });
    setShowModal(true);
  };

  const handleStatusChange = async (loomId, newStatus) => {
    try {
      await loomAPI.updateStatus(loomId, newStatus, activeCompany?._id);
      toast.success(`Loom status updated to ${newStatus}`);
      fetchLooms();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update loom status');
    }
  };

  const handleDeleteConfirm = (loom) => {
    setDeleteConfirm({ show: true, loom });
  };

  const handleDelete = async () => {
    const { loom } = deleteConfirm;
    
    try {
      await loomAPI.delete(loom._id, activeCompany?._id);
      toast.success('Loom deleted successfully');
      setDeleteConfirm({ show: false, loom: null });
      fetchLooms();
      fetchStats();
    } catch (error) {
      console.error('Error deleting loom:', error);
      toast.error(error.response?.data?.message || 'Failed to delete loom');
    }
  };

  const resetForm = () => {
    setFormData({
      loomType: 'Auto',  // Default to 'Auto' (matches model enum)
      loomMake: '',
      reedWidth: '',
      reedWidthUnit: 'inches',
      rpm: '',
      status: 'Idle',
      location: '',
      operatorAssigned: '',
      purchaseDate: '',
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      notes: '',
    });
    setEditingLoom(null);
    setErrors({});
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Active': { variant: 'success', icon: CheckCircle },
      'Idle': { variant: 'warning', icon: Clock },
      'Under Maintenance': { variant: 'info', icon: Wrench },
      'Breakdown': { variant: 'danger', icon: AlertTriangle },
    };
    return statusMap[status] || { variant: 'default', icon: Activity };
  };

  const filterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Idle', label: 'Idle' },
    { value: 'Under Maintenance', label: 'Under Maintenance' },
    { value: 'Breakdown', label: 'Breakdown' },
  ];

  const sortOptions = [
    { value: 'number-asc', label: 'Loom Number (A-Z)' },
    { value: 'number-desc', label: 'Loom Number (Z-A)' },
    { value: 'width-high', label: 'Reed Width (High to Low)' },
    { value: 'width-low', label: 'Reed Width (Low to High)' },
    { value: 'rpm-high', label: 'RPM (High to Low)' },
    { value: 'rpm-low', label: 'RPM (Low to High)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loom Management</h1>
          <p className="text-gray-600 mt-1">Manage your weaving looms and monitor their status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={handleRefresh}
            loading={refreshing}
            title="Refresh data"
          >
            Refresh
          </Button>
          {hasPermission('production:create') && (
            <Button
              icon={Plus}
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              Add Loom
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Looms</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalLooms || 0}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Factory className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeLooms || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Maintenance Due</p>
                <p className="text-3xl font-bold text-amber-600">{stats.maintenanceDue || 0}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Wrench className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Idle</p>
                <p className="text-3xl font-bold text-gray-600">
                  {stats.totalLooms - stats.activeLooms || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-xl">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search looms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={filterOptions}
            icon={Filter}
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={sortOptions}
          />
        </div>
      </Card>

      {/* Looms Table */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Looms ({filteredAndSortedLooms.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredAndSortedLooms.length === 0 ? (
          <div className="text-center py-12">
            <Factory className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No looms found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Loom Number
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Make
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                    Reed Width
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                    RPM
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedLooms.map((loom) => {
                  const statusBadge = getStatusBadge(loom.status);

                  return (
                    <tr key={loom._id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{loom.loomNumber}</div>
                        {loom.operatorAssigned && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {loom.operatorAssigned}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-900">{loom.loomType}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">{loom.loomMake || '-'}</span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-gray-900">
                          {loom.reedWidth} {loom.reedWidthUnit}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-gray-900">{loom.rpm}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">{loom.location || '-'}</span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Badge variant={statusBadge.variant}>
                          {loom.status}
                        </Badge>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => navigate(`/weaving/looms/${loom._id}`)}
                            title="View Details"
                          />
                          {hasPermission('production:edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleEdit(loom)}
                              title="Edit Loom"
                            />
                          )}
                          {hasPermission('production:delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteConfirm(loom)}
                              className="text-red-600 hover:bg-red-50"
                              title="Delete Loom"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              {editingLoom ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
            </div>
            <span>{editingLoom ? 'Edit Loom' : 'Add New Loom'}</span>
          </div>
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Factory className="w-4 h-4 text-indigo-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Loom Type"
                value={formData.loomType}
                onChange={(e) => {
                  setFormData({ ...formData, loomType: e.target.value });
                  setErrors({ ...errors, loomType: '' });
                }}
                options={loomTypeOptions}
                required
                error={errors.loomType}
              />

              <Input
                label="Manufacturer/Make"
                value={formData.loomMake}
                onChange={(e) => setFormData({ ...formData, loomMake: e.target.value })}
                placeholder="e.g., Toyota, Picanol"
                icon={Settings}
              />

              {editingLoom && (
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={statusOptions}
                  required
                />
              )}

              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Floor 1, Section A"
                icon={Settings}
              />

              <Input
                label="Operator Assigned"
                value={formData.operatorAssigned}
                onChange={(e) => setFormData({ ...formData, operatorAssigned: e.target.value })}
                placeholder="Operator name"
                icon={User}
              />
            </div>
          </div>

          {/* Specifications */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-600" />
              Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Reed Width"
                type="number"
                step="0.1"
                value={formData.reedWidth}
                onChange={(e) => {
                  setFormData({ ...formData, reedWidth: e.target.value });
                  setErrors({ ...errors, reedWidth: '' });
                }}
                required
                placeholder="e.g., 63"
                icon={Gauge}
                error={errors.reedWidth}
              />

              <Select
                label="Reed Width Unit"
                value={formData.reedWidthUnit}
                onChange={(e) => setFormData({ ...formData, reedWidthUnit: e.target.value })}
                options={reedWidthUnitOptions}
                required
              />

              <Input
                label="RPM (Revolutions Per Minute)"
                type="number"
                value={formData.rpm}
                onChange={(e) => {
                  setFormData({ ...formData, rpm: e.target.value });
                  setErrors({ ...errors, rpm: '' });
                }}
                required
                placeholder="e.g., 400"
                icon={TrendingUp}
                error={errors.rpm}
              />
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Dates & Maintenance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Purchase Date"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                icon={Calendar}
              />

              <Input
                label="Last Maintenance Date"
                type="date"
                value={formData.lastMaintenanceDate}
                onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                icon={Wrench}
              />

              <Input
                label="Next Maintenance Date"
                type="date"
                value={formData.nextMaintenanceDate}
                onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                icon={Calendar}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Add any additional notes about this loom..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={handleModalClose} type="button">
              Cancel
            </Button>
            <Button type="submit" icon={editingLoom ? Edit2 : Plus}>
              {editingLoom ? 'Update Loom' : 'Create Loom'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, loom: null })}
        title="Delete Loom"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Are you sure you want to delete this loom?
                </p>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>
              </div>
            </div>
          </div>

          {deleteConfirm.loom && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Loom to be deleted:</p>
              <p className="font-semibold text-gray-900">
                Loom {deleteConfirm.loom.loomNumber} ({deleteConfirm.loom.loomType})
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm({ show: false, loom: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Delete Loom
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoomManagement;