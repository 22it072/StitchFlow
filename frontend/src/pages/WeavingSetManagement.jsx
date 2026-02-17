// frontend/src/pages/WeavingSetManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  PackageCheck,
  Factory,
  Package,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Download,
  RefreshCw,
  Layers,
  Calendar,
  FileText,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { weavingSetAPI, loomAPI, beamAPI, partyAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useCompany } from '../context/CompanyContext';
import { formatRelativeTime } from '../utils/formatters';
import toast from 'react-hot-toast';

const WeavingSetManagement = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { activeCompany } = useCompany();

  const [sets, setSets] = useState([]);
  const [looms, setLooms] = useState([]);
  const [beams, setBeams] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('number-desc');
  const [showModal, setShowModal] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [stats, setStats] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, set: null });

  const [formData, setFormData] = useState({
    qualityName: '',
    partyId: '',
    orderQuantity: '',
    quantityUnit: 'meters',
    loomId: '',
    beamId: '',
    targetMetersPerDay: '',
    priority: 'Medium',
    startDate: '',
    notes: '',
    estimateId: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, [activeCompany?._id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [setsRes, loomsRes, beamsRes, partiesRes, statsRes] = await Promise.all([
        weavingSetAPI.getAll({ search }, activeCompany?._id),
        loomAPI.getAll({}, activeCompany?._id),
        beamAPI.getAvailable(activeCompany?._id),
        partyAPI.getAll({}, activeCompany?._id),
        weavingSetAPI.getStats(activeCompany?._id),
      ]);

      setSets(setsRes.data.sets || setsRes.data);
      setLooms(loomsRes.data.looms || loomsRes.data);
      setBeams(beamsRes.data.beams || beamsRes.data);
      setParties(partiesRes.data.parties || partiesRes.data);
      setStats(statsRes.data.stats || statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  // Helper function for priority badge styling
  const getPriorityBadgeClass = (priority) => {
    const classes = {
      'Urgent': 'bg-red-100 text-red-700 border-red-200',
      'High': 'bg-orange-100 text-orange-700 border-orange-200',
      'Medium': 'bg-blue-100 text-blue-700 border-blue-200',
      'Low': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return classes[priority] || classes.Medium;
  };

  // Filter and sort sets
  const filteredAndSortedSets = useMemo(() => {
    let filtered = [...sets];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(set =>
        set.setNumber?.toLowerCase().includes(search.toLowerCase()) ||
        set.qualityName?.toLowerCase().includes(search.toLowerCase()) ||
        set.partyId?.partyName?.toLowerCase().includes(search.toLowerCase()) ||
        set.allocatedLoomId?.loomNumber?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(set => set.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'number-asc':
        filtered.sort((a, b) => a.setNumber.localeCompare(b.setNumber, undefined, { numeric: true }));
        break;
      case 'number-desc':
        filtered.sort((a, b) => b.setNumber.localeCompare(a.setNumber, undefined, { numeric: true }));
        break;
      case 'target-high':
        filtered.sort((a, b) => b.orderQuantity - a.orderQuantity);
        break;
      case 'target-low':
        filtered.sort((a, b) => a.orderQuantity - b.orderQuantity);
        break;
      case 'date-new':
        filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        break;
      case 'date-old':
        filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      default:
        break;
    }

    return filtered;
  }, [sets, search, statusFilter, sortBy]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.qualityName?.trim()) {
      newErrors.qualityName = 'Quality name is required';
    }

    if (!formData.partyId) {
      newErrors.partyId = 'Please select a party';
    }

    if (!formData.orderQuantity || Number(formData.orderQuantity) <= 0) {
      newErrors.orderQuantity = 'Order quantity must be greater than 0';
    }

    if (!formData.loomId) {
      newErrors.loomId = 'Please select a loom';
    }

    if (!formData.beamId) {
      newErrors.beamId = 'Please select a beam';
    }

    const targetMetersPerDay = Number(formData.targetMetersPerDay);
    if (formData.targetMetersPerDay && (targetMetersPerDay <= 0 || isNaN(targetMetersPerDay))) {
      newErrors.targetMetersPerDay = 'Target meters per day must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      const payload = {
        qualityName: formData.qualityName.trim(),
        partyId: formData.partyId,
        orderQuantity: Number(formData.orderQuantity),
        quantityUnit: formData.quantityUnit,
        allocatedLoomId: formData.loomId,
        allocatedBeamId: formData.beamId,
        priority: formData.priority,
      };

      // Optional fields
      if (formData.estimateId) {
        payload.estimateId = formData.estimateId;
      }

      if (formData.targetMetersPerDay && Number(formData.targetMetersPerDay) > 0) {
        payload.targetMetersPerDay = Number(formData.targetMetersPerDay);
      }

      if (formData.startDate) {
        payload.startDate = formData.startDate;
      }

      if (formData.notes?.trim()) {
        payload.notes = formData.notes.trim();
      }

      console.log('Submitting set payload:', payload);

      if (editingSet) {
        await weavingSetAPI.update(editingSet._id, payload);
        toast.success('Weaving set updated successfully');
      } else {
        await weavingSetAPI.create(payload);
        toast.success('Weaving set created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving set:', error);
      console.error('Error response:', error.response?.data);
      
      // Show specific validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.msg).join(', ');
        toast.error(errorMessages);
      } else {
        toast.error(error.response?.data?.message || 'Failed to save weaving set');
      }
    }
  };

  const handleEdit = (set) => {
    setEditingSet(set);
    setFormData({
      qualityName: set.qualityName || '',
      partyId: set.partyId?._id || '',
      orderQuantity: set.orderQuantity || '',
      quantityUnit: set.quantityUnit || 'meters',
      loomId: set.allocatedLoomId?._id || '',
      beamId: set.allocatedBeamId?._id || '',
      targetMetersPerDay: set.targetMetersPerDay || '',
      priority: set.priority || 'Medium',
      startDate: set.startDate ? new Date(set.startDate).toISOString().split('T')[0] : '',
      notes: set.notes || '',
      estimateId: set.estimateId?._id || '',
    });
    setShowModal(true);
  };

  const handleStatusChange = async (setId, newStatus) => {
    try {
      await weavingSetAPI.updateStatus(setId, newStatus, activeCompany?._id);
      toast.success(`Set status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update set status');
    }
  };

  const handleDeleteConfirm = (set) => {
    setDeleteConfirm({ show: true, set });
  };

  const handleDelete = async () => {
    const { set } = deleteConfirm;

    try {
      await weavingSetAPI.delete(set._id, activeCompany?._id);
      toast.success('Weaving set deleted successfully');
      setDeleteConfirm({ show: false, set: null });
      fetchData();
    } catch (error) {
      console.error('Error deleting set:', error);
      toast.error(error.response?.data?.message || 'Failed to delete weaving set');
    }
  };

  const resetForm = () => {
    setFormData({
      qualityName: '',
      partyId: '',
      orderQuantity: '',
      quantityUnit: 'meters',
      loomId: '',
      beamId: '',
      targetMetersPerDay: '',
      priority: 'Medium',
      startDate: '',
      notes: '',
      estimateId: '',
    });
    setEditingSet(null);
    setErrors({});
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  // Status options - MUST match backend enum
  const statusOptions = [
    { value: 'Pending', label: 'Pending', color: '#F59E0B', icon: '⏳' },
    { value: 'In Progress', label: 'In Progress', color: '#3B82F6', icon: '🔄' },
    { value: 'Completed', label: 'Completed', color: '#10B981', icon: '✓' },
    { value: 'On Hold', label: 'On Hold', color: '#F97316', icon: '⏸' },
    { value: 'Cancelled', label: 'Cancelled', color: '#6B7280', icon: '✕' },
  ];

  // Sort options
  const sortOptions = [
    { value: 'number-desc', label: 'Set Number (Newest)', icon: '🔢' },
    { value: 'number-asc', label: 'Set Number (Oldest)', icon: '🔢' },
    { value: 'target-high', label: 'Order Quantity (High to Low)', icon: '📏' },
    { value: 'target-low', label: 'Order Quantity (Low to High)', icon: '📏' },
    { value: 'date-new', label: 'Start Date (Newest)', icon: '📅' },
    { value: 'date-old', label: 'Start Date (Oldest)', icon: '📅' },
  ];

  // Priority options - MUST match backend enum exactly: ['Low', 'Medium', 'High', 'Urgent']
  const priorityOptions = [
    { value: 'Low', label: 'Low Priority' },
    { value: 'Medium', label: 'Medium Priority' },
    { value: 'High', label: 'High Priority' },
    { value: 'Urgent', label: 'Urgent' },
  ];

  // Quantity unit options - MUST match backend enum exactly: ['meters', 'yards', 'pieces']
  const quantityUnitOptions = [
    { value: 'meters', label: 'Meters' },
    { value: 'yards', label: 'Yards' },
    { value: 'pieces', label: 'Pieces' },
  ];

  // Loom options
  const loomOptions = looms.map(loom => ({
    value: loom._id,
    label: `Loom ${loom.loomNumber} (${loom.status})`,
    description: `${loom.loomType} - ${loom.width || 'N/A'} inches`,
    disabled: loom.status !== 'Idle' && loom.status !== 'Active',
  }));

  // Beam options
  const beamOptions = beams.map(beam => ({
    value: beam._id,
    label: `Beam ${beam.beamNumber}`,
    description: `${beam.yarnType || 'N/A'} - ${beam.remainingLength?.toFixed(0) || 0}m remaining`,
  }));

  // Party options
  const partyOptions = parties.map(party => ({
    value: party._id,
    label: party.partyName,
    description: party.contactPerson,
  }));

  const getStatusConfig = (status) => {
    const configs = {
      'Pending': { variant: 'warning', icon: Clock },
      'In Progress': { variant: 'info', icon: Activity },
      'Completed': { variant: 'success', icon: CheckCircle },
      'On Hold': { variant: 'warning', icon: AlertTriangle },
      'Cancelled': { variant: 'default', icon: XCircle },
    };
    return configs[status] || configs.Pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <PackageCheck className="w-6 h-6 text-green-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
              <PackageCheck className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Weaving Set Management</h1>
              <p className="text-gray-500 mt-1">Create and manage weaving sets with looms and beams</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={handleRefresh}
            disabled={refreshing}
            className={refreshing ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
          <Button variant="ghost" icon={Download}>
            Export
          </Button>
          {hasPermission('production:create') && (
            <Button
              icon={Plus}
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              New Set
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PackageCheck className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">Total Sets</p>
                </div>
                <p className="text-3xl font-bold text-green-900">{stats.total || sets.length}</p>
                <p className="text-xs text-green-600 mt-1">All weaving sets</p>
              </div>
              <div className="p-3 bg-green-200 rounded-xl">
                <Layers className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-600 font-medium">In Progress</p>
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.statusDistribution?.find(s => s._id === 'In Progress')?.count || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">Currently weaving</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                  <p className="text-sm text-purple-600 font-medium">Completed</p>
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {stats.statusDistribution?.find(s => s._id === 'Completed')?.count || 0}
                </p>
                <p className="text-xs text-purple-600 mt-1">Successfully finished</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <Target className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-600 font-medium">Pending</p>
                </div>
                <p className="text-3xl font-bold text-amber-900">
                  {stats.statusDistribution?.find(s => s._id === 'Pending')?.count || 0}
                </p>
                <p className="text-xs text-amber-600 mt-1">Awaiting start</p>
              </div>
              <div className="p-3 bg-amber-200 rounded-xl">
                <Calendar className="w-6 h-6 text-amber-700" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by set number, quality, party, or loom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
          
          <div className="flex gap-3">
            <Button
              variant={statusFilter === 'all' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              All ({sets.length})
            </Button>
            <Button
              variant={statusFilter === 'Pending' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('Pending')}
              size="sm"
              icon={Clock}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 'In Progress' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('In Progress')}
              size="sm"
              icon={Activity}
            >
              In Progress
            </Button>
            <Button
              variant={statusFilter === 'Completed' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('Completed')}
              size="sm"
              icon={CheckCircle}
            >
              Completed
            </Button>
          </div>

          <div className="w-full lg:w-64">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={sortOptions}
              placeholder="Sort by..."
              icon={Filter}
              size="sm"
            />
          </div>
        </div>
      </Card>

      {/* Set List */}
      <Card>
        {filteredAndSortedSets.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <PackageCheck className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">
                {search || statusFilter !== 'all' ? 'No sets found' : 'No weaving sets yet'}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Create your first weaving set to start production'}
              </p>
            </div>
            {hasPermission('production:create') && !search && statusFilter === 'all' && (
              <Button icon={Plus} onClick={() => setShowModal(true)}>
                Create First Set
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Set Details</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Party</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Loom & Beam</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Quantity</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Timeline</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedSets.map((set, index) => {
                  const statusConfig = getStatusConfig(set.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr
                      key={set._id}
                      className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            set.status === 'Completed' ? 'bg-green-100' :
                            set.status === 'In Progress' ? 'bg-blue-100' :
                            set.status === 'Pending' ? 'bg-amber-100' : 'bg-gray-100'
                          }`}>
                            <PackageCheck className={`w-5 h-5 ${
                              set.status === 'Completed' ? 'text-green-600' :
                              set.status === 'In Progress' ? 'text-blue-600' :
                              set.status === 'Pending' ? 'text-amber-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Set {set.setNumber}</p>
                            {set.qualityName && (
                              <p className="text-sm text-gray-600">{set.qualityName}</p>
                            )}
                            {set.priority && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium mt-1 ${getPriorityBadgeClass(set.priority)}`}>
                                {set.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-sm text-gray-700">
                            {set.partyId?.partyName || 'N/A'}
                          </span>
                        </div>
                        {set.partyId?.contactPerson && (
                          <p className="text-xs text-gray-500 mt-0.5 ml-5">
                            {set.partyId.contactPerson}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Factory className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-gray-700">
                              Loom {set.allocatedLoomId?.loomNumber || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Package className="w-3.5 h-3.5 text-purple-500" />
                            <span className="text-gray-700">
                              Beam {set.allocatedBeamId?.beamNumber || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Target className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">
                              {set.orderQuantity} {set.quantityUnit}
                            </span>
                          </div>
                          {set.producedQuantity > 0 && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-gray-700">
                                {set.producedQuantity} produced
                              </span>
                            </div>
                          )}
                          {set.targetMetersPerDay && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-gray-700">
                                {set.targetMetersPerDay}/day
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {set.startDate && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-gray-700">
                                {new Date(set.startDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {set.expectedCompletionDate && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-gray-700">
                                {new Date(set.expectedCompletionDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {!set.startDate && !set.expectedCompletionDate && (
                            <span className="text-sm text-gray-400">No dates set</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant={statusConfig.variant} icon={StatusIcon}>
                            {set.status}
                          </Badge>
                          {hasPermission('production:edit') && (
                            <Select
                              value={set.status}
                              onChange={(e) => handleStatusChange(set._id, e.target.value)}
                              options={statusOptions}
                              size="sm"
                              className="min-w-[140px]"
                            />
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => navigate(`/weaving/sets/${set._id}`)}
                            title="View Details"
                          />
                          {hasPermission('production:edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleEdit(set)}
                              title="Edit Set"
                            />
                          )}
                          {hasPermission('production:delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteConfirm(set)}
                              className="text-red-600 hover:bg-red-50"
                              title="Delete Set"
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
            <div className="p-2 bg-green-100 rounded-lg">
              {editingSet ? <Edit2 className="w-5 h-5 text-green-600" /> : <Plus className="w-5 h-5 text-green-600" />}
            </div>
            <span>{editingSet ? 'Edit Weaving Set' : 'Create New Weaving Set'}</span>
          </div>
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-green-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Quality Name"
                value={formData.qualityName}
                onChange={(e) => {
                  setFormData({ ...formData, qualityName: e.target.value });
                  setErrors({ ...errors, qualityName: '' });
                }}
                required
                placeholder="e.g., Premium Cotton Fabric"
                icon={Layers}
                error={errors.qualityName}
              />

              <Select
                label="Select Party"
                value={formData.partyId}
                onChange={(e) => {
                  setFormData({ ...formData, partyId: e.target.value });
                  setErrors({ ...errors, partyId: '' });
                }}
                options={partyOptions}
                placeholder="Choose a party"
                required
                searchable
                error={errors.partyId}
              />

              <Input
                label="Order Quantity"
                type="number"
                step="0.01"
                value={formData.orderQuantity}
                onChange={(e) => {
                  setFormData({ ...formData, orderQuantity: e.target.value });
                  setErrors({ ...errors, orderQuantity: '' });
                }}
                required
                placeholder="e.g., 1000"
                icon={Target}
                error={errors.orderQuantity}
              />

              <Select
                label="Quantity Unit"
                value={formData.quantityUnit}
                onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
                options={quantityUnitOptions}
                required
              />

              <Select
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                options={priorityOptions}
                required
              />

              <Input
                label="Target Meters/Day"
                type="number"
                step="0.1"
                value={formData.targetMetersPerDay}
                onChange={(e) => {
                  setFormData({ ...formData, targetMetersPerDay: e.target.value });
                  setErrors({ ...errors, targetMetersPerDay: '' });
                }}
                placeholder="e.g., 100"
                icon={TrendingUp}
                error={errors.targetMetersPerDay}
              />
            </div>
          </div>

          {/* Loom & Beam Assignment */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Factory className="w-4 h-4 text-green-600" />
              Loom & Beam Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Select Loom"
                value={formData.loomId}
                onChange={(e) => {
                  setFormData({ ...formData, loomId: e.target.value });
                  setErrors({ ...errors, loomId: '' });
                }}
                options={loomOptions}
                placeholder="Choose a loom"
                required
                searchable
                error={errors.loomId}
              />

              <Select
                label="Select Beam"
                value={formData.beamId}
                onChange={(e) => {
                  setFormData({ ...formData, beamId: e.target.value });
                  setErrors({ ...errors, beamId: '' });
                }}
                options={beamOptions}
                placeholder="Choose a beam"
                required
                searchable
                error={errors.beamId}
              />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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
              maxLength={1000}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
              placeholder="Add any additional notes about this weaving set..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.notes.length}/1000 characters
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={handleModalClose} type="button">
              Cancel
            </Button>
            <Button type="submit" icon={editingSet ? Edit2 : Plus}>
              {editingSet ? 'Update Set' : 'Create Set'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, set: null })}
        title="Delete Weaving Set"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Are you sure you want to delete this weaving set?
                </p>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>
              </div>
            </div>
          </div>

          {deleteConfirm.set && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Set to be deleted:</p>
              <p className="font-semibold text-gray-900">
                Set {deleteConfirm.set.setNumber}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Quality: {deleteConfirm.set.qualityName || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                Party: {deleteConfirm.set.partyId?.partyName || 'N/A'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm({ show: false, set: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Delete Set
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WeavingSetManagement;