// frontend/src/pages/BeamManagement.jsx - FIXED VERSION
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Package,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  RefreshCw,
  Ruler,
  Weight,
  Calendar,
  TrendingDown,
  Info,
  Zap,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { beamAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useCompany } from '../context/CompanyContext';
import { formatRelativeTime } from '../utils/formatters';
import toast from 'react-hot-toast';

const BeamManagement = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { activeCompany } = useCompany();
  
  const [beams, setBeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('number-asc');
  const [showModal, setShowModal] = useState(false);
  const [editingBeam, setEditingBeam] = useState(null);
  const [stats, setStats] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, beam: null });
  const [updateRemainingModal, setUpdateRemainingModal] = useState({ show: false, beam: null, value: '' });
  
  // FIXED: Form data now matches backend requirements
  const [formData, setFormData] = useState({
    beamType: 'Warp Beam',  // Default to 'Warp Beam' (matches model enum)
    qualityName: '',
    tar: '',
    denier: '',
    totalLength: '',
    lengthUnit: 'meters',
    preparationDate: '',
    estimateId: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  // Beam type options (MUST match Beam.js model enum exactly!)
  const beamTypeOptions = [
    { value: 'Warp Beam', label: 'Warp Beam' },
    { value: "Weaver's Beam", label: "Weaver's Beam" },
  ];

  // Length unit options
  const lengthUnitOptions = [
    { value: 'meters', label: 'Meters' },
    { value: 'yards', label: 'Yards' },
  ];

  useEffect(() => {
    fetchBeams();
    fetchStats();
  }, [activeCompany?._id]);

  const fetchBeams = async () => {
    try {
      setLoading(true);
      const params = { search };
      const response = await beamAPI.getAll(params, activeCompany?._id);
      setBeams(response.data.beams || response.data);
    } catch (error) {
      console.error('Error fetching beams:', error);
      toast.error('Failed to load beams');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await beamAPI.getStats(activeCompany?._id);
      setStats(response.data.stats || response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBeams(), fetchStats()]);
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  // Filter and sort beams
  const filteredAndSortedBeams = useMemo(() => {
    let filtered = [...beams];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(beam =>
        beam.beamNumber?.toLowerCase().includes(search.toLowerCase()) ||
        beam.qualityName?.toLowerCase().includes(search.toLowerCase()) ||
        beam.beamType?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(beam => beam.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'number-asc':
        filtered.sort((a, b) => a.beamNumber?.localeCompare(b.beamNumber, undefined, { numeric: true }));
        break;
      case 'number-desc':
        filtered.sort((a, b) => b.beamNumber?.localeCompare(a.beamNumber, undefined, { numeric: true }));
        break;
      case 'remaining-high':
        filtered.sort((a, b) => b.remainingLength - a.remainingLength);
        break;
      case 'remaining-low':
        filtered.sort((a, b) => a.remainingLength - b.remainingLength);
        break;
      default:
        break;
    }

    return filtered;
  }, [beams, search, statusFilter, sortBy]);

  const getBeamUsage = (beam) => {
    if (beam.totalLength === 0) return 0;
    return ((beam.totalLength - beam.remainingLength) / beam.totalLength * 100);
  };

  const getBeamStatus = (beam) => {
    if (beam.status === 'Exhausted') return { label: 'Exhausted', variant: 'default', color: 'gray' };
    if (beam.status === 'On Loom') return { label: 'On Loom', variant: 'info', color: 'blue' };
    if (beam.status === 'Ready') return { label: 'Ready', variant: 'success', color: 'green' };
    return { label: beam.status, variant: 'default', color: 'gray' };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.qualityName.trim()) {
      newErrors.qualityName = 'Quality name is required';
    }

    if (!formData.beamType) {
      newErrors.beamType = 'Beam type is required';
    }

    const tar = Number(formData.tar);
    if (!formData.tar || tar <= 0 || isNaN(tar)) {
      newErrors.tar = 'TAR must be a positive number';
    }

    const denier = Number(formData.denier);
    if (!formData.denier || denier <= 0 || isNaN(denier)) {
      newErrors.denier = 'Denier must be a positive number';
    }

    const totalLength = Number(formData.totalLength);
    if (!formData.totalLength || totalLength <= 0 || isNaN(totalLength)) {
      newErrors.totalLength = 'Total length must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FIXED: handleSubmit now sends correct beam payload
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      // Build payload matching backend requirements
      const payload = {
        beamType: formData.beamType,
        qualityName: formData.qualityName.trim(),
        tar: Number(formData.tar),
        denier: Number(formData.denier),
        totalLength: Number(formData.totalLength),
        lengthUnit: formData.lengthUnit,
      };

      // Optional fields
      if (formData.preparationDate) {
        payload.preparationDate = formData.preparationDate;
      }

      if (formData.estimateId?.trim()) {
        payload.estimateId = formData.estimateId.trim();
      }

      if (formData.notes?.trim()) {
        payload.notes = formData.notes.trim();
      }

      console.log('Submitting beam payload:', payload);

      if (editingBeam) {
        await beamAPI.update(editingBeam._id, payload, activeCompany?._id);
        toast.success('Beam updated successfully');
      } else {
        await beamAPI.create(payload, activeCompany?._id);
        toast.success('Beam created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchBeams();
      fetchStats();
    } catch (error) {
      console.error('Error saving beam:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save beam');
    }
  };

  const handleEdit = (beam) => {
    setEditingBeam(beam);
    setFormData({
      beamType: beam.beamType || 'Warp Beam',  // Default to 'Warp Beam'
      qualityName: beam.qualityName || '',
      tar: beam.tar || '',
      denier: beam.denier || '',
      totalLength: beam.totalLength || '',
      lengthUnit: beam.lengthUnit || 'meters',
      preparationDate: beam.preparationDate ? new Date(beam.preparationDate).toISOString().split('T')[0] : '',
      estimateId: beam.estimateId?._id || beam.estimateId || '',
      notes: beam.notes || '',
    });
    setShowModal(true);
  };

  const handleUpdateRemaining = (beam) => {
    setUpdateRemainingModal({
      show: true,
      beam,
      value: beam.remainingLength.toString(),
    });
  };

  const handleUpdateRemainingSubmit = async () => {
    const { beam, value } = updateRemainingModal;
    const newRemaining = Number(value);

    if (isNaN(newRemaining) || newRemaining < 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    if (newRemaining > beam.totalLength) {
      toast.error('Remaining length cannot exceed total length');
      return;
    }

    try {
      await beamAPI.updateRemaining(beam._id, newRemaining, activeCompany?._id);
      toast.success('Remaining length updated successfully');
      setUpdateRemainingModal({ show: false, beam: null, value: '' });
      fetchBeams();
      fetchStats();
    } catch (error) {
      console.error('Error updating remaining length:', error);
      toast.error('Failed to update remaining length');
    }
  };

  const handleDeleteConfirm = (beam) => {
    setDeleteConfirm({ show: true, beam });
  };

  const handleDelete = async () => {
    const { beam } = deleteConfirm;
    
    try {
      await beamAPI.delete(beam._id, activeCompany?._id);
      toast.success('Beam deleted successfully');
      setDeleteConfirm({ show: false, beam: null });
      fetchBeams();
      fetchStats();
    } catch (error) {
      console.error('Error deleting beam:', error);
      toast.error(error.response?.data?.message || 'Failed to delete beam');
    }
  };

  const resetForm = () => {
    setFormData({
      beamType: 'Warp Beam',  // Default to 'Warp Beam' (matches model enum)
      qualityName: '',
      tar: '',
      denier: '',
      totalLength: '',
      lengthUnit: 'meters',
      preparationDate: '',
      estimateId: '',
      notes: '',
    });
    setEditingBeam(null);
    setErrors({});
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Ready', label: 'Ready' },
    { value: 'On Loom', label: 'On Loom' },
    { value: 'Exhausted', label: 'Exhausted' },
  ];

  const sortOptions = [
    { value: 'number-asc', label: 'Beam Number (A-Z)' },
    { value: 'number-desc', label: 'Beam Number (Z-A)' },
    { value: 'remaining-high', label: 'Remaining Length (High to Low)' },
    { value: 'remaining-low', label: 'Remaining Length (Low to High)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beam Management</h1>
          <p className="text-gray-600 mt-1">Manage warp and weft beams inventory</p>
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
              Add Beam
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Beams</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBeams || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ready Beams</p>
                <p className="text-3xl font-bold text-green-600">{stats.readyBeams || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">On Loom</p>
                <p className="text-3xl font-bold text-blue-600">{stats.onLoomBeams || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search beams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
            icon={Filter}
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={sortOptions}
          />
        </div>
      </Card>

      {/* Beams Table */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Beams ({filteredAndSortedBeams.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredAndSortedBeams.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No beams found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Beam Number
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Quality
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                    TAR
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                    Denier
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                    Total Length
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                    Remaining
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
                {filteredAndSortedBeams.map((beam) => {
                  const status = getBeamStatus(beam);
                  const usage = getBeamUsage(beam);

                  return (
                    <tr key={beam._id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{beam.beamNumber}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">{beam.beamType}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-900">{beam.qualityName}</span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-gray-900">{beam.tar}</span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-gray-900">{beam.denier}</span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-gray-900">
                          {beam.totalLength} {beam.lengthUnit}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-gray-900">
                            {beam.remainingLength} {beam.lengthUnit}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  usage >= 100 ? 'bg-gray-400' :
                                  usage > 80 ? 'bg-amber-500' :
                                  usage > 0 ? 'bg-blue-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${100 - usage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {(100 - usage).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => navigate(`/weaving/beams/${beam._id}`)}
                            title="View Details"
                          />
                          {hasPermission('production:edit') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Edit2}
                                onClick={() => handleEdit(beam)}
                                title="Edit Beam"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={TrendingDown}
                                onClick={() => handleUpdateRemaining(beam)}
                                title="Update Remaining"
                                className="text-blue-600 hover:bg-blue-50"
                              />
                            </>
                          )}
                          {hasPermission('production:delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteConfirm(beam)}
                              className="text-red-600 hover:bg-red-50"
                              title="Delete Beam"
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
            <div className="p-2 bg-purple-100 rounded-lg">
              {editingBeam ? <Edit2 className="w-5 h-5 text-purple-600" /> : <Plus className="w-5 h-5 text-purple-600" />}
            </div>
            <span>{editingBeam ? 'Edit Beam' : 'Add New Beam'}</span>
          </div>
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Beam Type"
                value={formData.beamType}
                onChange={(e) => {
                  setFormData({ ...formData, beamType: e.target.value });
                  setErrors({ ...errors, beamType: '' });
                }}
                options={beamTypeOptions}
                required
                error={errors.beamType}
              />

              <Input
                label="Quality Name"
                value={formData.qualityName}
                onChange={(e) => {
                  setFormData({ ...formData, qualityName: e.target.value });
                  setErrors({ ...errors, qualityName: '' });
                }}
                required
                placeholder="e.g., Premium Cotton"
                icon={Layers}
                error={errors.qualityName}
              />

              <Input
                label="Estimate ID (Optional)"
                value={formData.estimateId}
                onChange={(e) => setFormData({ ...formData, estimateId: e.target.value })}
                placeholder="Link to estimate"
                icon={Info}
              />

              <Input
                label="Preparation Date"
                type="date"
                value={formData.preparationDate}
                onChange={(e) => setFormData({ ...formData, preparationDate: e.target.value })}
                icon={Calendar}
              />
            </div>
          </div>

          {/* Specifications */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-purple-600" />
              Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="TAR (Total Available Repeats)"
                type="number"
                step="0.01"
                value={formData.tar}
                onChange={(e) => {
                  setFormData({ ...formData, tar: e.target.value });
                  setErrors({ ...errors, tar: '' });
                }}
                required
                placeholder="e.g., 3000"
                icon={Layers}
                error={errors.tar}
              />

              <Input
                label="Denier"
                type="number"
                step="0.01"
                value={formData.denier}
                onChange={(e) => {
                  setFormData({ ...formData, denier: e.target.value });
                  setErrors({ ...errors, denier: '' });
                }}
                required
                placeholder="e.g., 150"
                icon={Weight}
                error={errors.denier}
              />

              <Input
                label="Total Length"
                type="number"
                step="0.01"
                value={formData.totalLength}
                onChange={(e) => {
                  setFormData({ ...formData, totalLength: e.target.value });
                  setErrors({ ...errors, totalLength: '' });
                }}
                required
                placeholder="e.g., 1000"
                icon={Ruler}
                error={errors.totalLength}
              />

              <Select
                label="Length Unit"
                value={formData.lengthUnit}
                onChange={(e) => setFormData({ ...formData, lengthUnit: e.target.value })}
                options={lengthUnitOptions}
                required
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
              placeholder="Add any additional notes about this beam..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={handleModalClose} type="button">
              Cancel
            </Button>
            <Button type="submit" icon={editingBeam ? Edit2 : Plus}>
              {editingBeam ? 'Update Beam' : 'Create Beam'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Remaining Length Modal */}
      <Modal
        isOpen={updateRemainingModal.show}
        onClose={() => setUpdateRemainingModal({ show: false, beam: null, value: '' })}
        title="Update Remaining Length"
        size="md"
      >
        <div className="space-y-4">
          {updateRemainingModal.beam && (
            <>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Beam:</p>
                <p className="font-semibold text-gray-900">{updateRemainingModal.beam.beamNumber}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Total Length: {updateRemainingModal.beam.totalLength} {updateRemainingModal.beam.lengthUnit}
                </p>
              </div>

              <Input
                label="Remaining Length"
                type="number"
                step="0.01"
                value={updateRemainingModal.value}
                onChange={(e) => setUpdateRemainingModal({
                  ...updateRemainingModal,
                  value: e.target.value,
                })}
                placeholder="Enter remaining length"
                icon={Ruler}
              />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setUpdateRemainingModal({ show: false, beam: null, value: '' })}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateRemainingSubmit}>
                  Update
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, beam: null })}
        title="Delete Beam"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Are you sure you want to delete this beam?
                </p>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>
              </div>
            </div>
          </div>

          {deleteConfirm.beam && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Beam to be deleted:</p>
              <p className="font-semibold text-gray-900">
                {deleteConfirm.beam.beamNumber} - {deleteConfirm.beam.qualityName}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm({ show: false, beam: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Delete Beam
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BeamManagement;