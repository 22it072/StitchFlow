// frontend/src/pages/PartyManagement.jsx (Enhanced)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  TrendingUp,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Percent,
  Filter,
  Download,
  RefreshCw,
  Users,
  DollarSign,
  FileText,
  Activity,
  User,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { partyAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { formatCurrency } from '../utils/challanCalculations';
import toast from 'react-hot-toast';

const PartyManagement = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [stats, setStats] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, party: null });
  
  const [formData, setFormData] = useState({
    partyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    paymentTermsDays: 30,
    interestPercentPerDay: 0,
    interestType: 'compound',
    creditLimit: 0,
    activeStatus: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchParties();
    fetchStats();
  }, []);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      };
      const response = await partyAPI.getAll(params);
      setParties(response.data.parties);
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await partyAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchParties(), fetchStats()]);
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  // Filter and sort parties
  const filteredAndSortedParties = useMemo(() => {
    let filtered = [...parties];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(party =>
        party.partyName.toLowerCase().includes(search.toLowerCase()) ||
        party.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
        party.phone?.includes(search) ||
        party.gstNumber?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply active status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(party => 
        party.activeStatus === (activeFilter === 'active')
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'name-asc':
        filtered.sort((a, b) => a.partyName.localeCompare(b.partyName));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.partyName.localeCompare(a.partyName));
        break;
      case 'outstanding-high':
        filtered.sort((a, b) => b.currentOutstanding - a.currentOutstanding);
        break;
      case 'outstanding-low':
        filtered.sort((a, b) => a.currentOutstanding - b.currentOutstanding);
        break;
      case 'credit-high':
        filtered.sort((a, b) => b.creditLimit - a.creditLimit);
        break;
      case 'credit-low':
        filtered.sort((a, b) => a.creditLimit - b.creditLimit);
        break;
      default:
        break;
    }

    return filtered;
  }, [parties, search, activeFilter, sortBy]);

  const validateForm = () => {
  const newErrors = {};

  if (!formData.partyName.trim()) {
    newErrors.partyName = 'Party name is required';
  }

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    newErrors.email = 'Invalid email address';
  }

  if (formData.gstNumber && formData.gstNumber.length !== 15) {
    newErrors.gstNumber = 'GST number must be 15 characters';
  }

  // Check if values exist before validation
  const paymentTerms = Number(formData.paymentTermsDays);
  if (formData.paymentTermsDays !== '' && paymentTerms < 0) {
    newErrors.paymentTermsDays = 'Payment terms cannot be negative';
  }

  const interestRate = Number(formData.interestPercentPerDay);
  if (formData.interestPercentPerDay !== '' && interestRate < 0) {
    newErrors.interestPercentPerDay = 'Interest rate cannot be negative';
  }

  const creditLimit = Number(formData.creditLimit);
  if (formData.creditLimit !== '' && creditLimit < 0) {
    newErrors.creditLimit = 'Credit limit cannot be negative';
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
    // Create properly typed payload - handle empty strings
    const payload = {
      partyName: formData.partyName.trim(),
      contactPerson: formData.contactPerson?.trim() || '',
      phone: formData.phone?.trim() || '',
      email: formData.email?.trim() || '',
      address: formData.address?.trim() || '',
      gstNumber: formData.gstNumber?.trim() || '',
      paymentTermsDays: formData.paymentTermsDays === '' || formData.paymentTermsDays === null 
        ? 30 
        : Number(formData.paymentTermsDays),
      interestPercentPerDay: formData.interestPercentPerDay === '' || formData.interestPercentPerDay === null 
        ? 0 
        : Number(formData.interestPercentPerDay),
      interestType: formData.interestType,
      creditLimit: formData.creditLimit === '' || formData.creditLimit === null 
        ? 0 
        : Number(formData.creditLimit),
      activeStatus: Boolean(formData.activeStatus),
    };

    console.log('Submitting payload:', payload); // Debug log

    if (editingParty) {
      await partyAPI.update(editingParty._id, payload);
      toast.success('Party updated successfully');
    } else {
      await partyAPI.create(payload);
      toast.success('Party created successfully');
    }
    
    setShowModal(false);
    resetForm();
    fetchParties();
    fetchStats();
  } catch (error) {
    console.error('Error saving party:', error);
    toast.error(error.response?.data?.message || 'Failed to save party');
  }
};

  const handleEdit = (party) => {
    setEditingParty(party);
    setFormData({
      partyName: party.partyName,
      contactPerson: party.contactPerson || '',
      phone: party.phone || '',
      email: party.email || '',
      address: party.address || '',
      gstNumber: party.gstNumber || '',
      paymentTermsDays: party.paymentTermsDays,
      interestPercentPerDay: party.interestPercentPerDay,
      interestType: party.interestType,
      creditLimit: party.creditLimit,
      activeStatus: party.activeStatus,
    });
    setShowModal(true);
  };

  const handleDeleteConfirm = (party) => {
    setDeleteConfirm({ show: true, party });
  };

  const handleDelete = async () => {
    const { party } = deleteConfirm;
    
    try {
      await partyAPI.delete(party._id);
      toast.success('Party deleted successfully');
      setDeleteConfirm({ show: false, party: null });
      fetchParties();
      fetchStats();
    } catch (error) {
      console.error('Error deleting party:', error);
      toast.error(error.response?.data?.message || 'Failed to delete party');
    }
  };

  const resetForm = () => {
    setFormData({
      partyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      paymentTermsDays: 30,
      interestPercentPerDay: 0,
      interestType: 'compound',
      creditLimit: 0,
      activeStatus: true,
    });
    setEditingParty(null);
    setErrors({});
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  // Interest type options for Select component
  const interestTypeOptions = [
    {
      value: 'compound',
      label: 'Compound Interest',
      description: 'Interest calculated on principal + accumulated interest',
      icon: '📈',
    },
    {
      value: 'simple',
      label: 'Simple Interest',
      description: 'Interest calculated only on principal amount',
      icon: '📊',
    },
  ];

  // Sort options for Select component
  const sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)', icon: '🔤' },
    { value: 'name-desc', label: 'Name (Z-A)', icon: '🔤' },
    { value: 'outstanding-high', label: 'Outstanding (High to Low)', icon: '💰' },
    { value: 'outstanding-low', label: 'Outstanding (Low to High)', icon: '💰' },
    { value: 'credit-high', label: 'Credit Limit (High to Low)', icon: '💳' },
    { value: 'credit-low', label: 'Credit Limit (Low to High)', icon: '💳' },
  ];

  const getCreditUtilization = (party) => {
    if (party.creditLimit === 0) return 0;
    return (party.currentOutstanding / party.creditLimit * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl">
              <Users className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Party Management</h1>
              <p className="text-gray-500 mt-1">Manage business parties and credit terms</p>
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
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
            >
              Add Party
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-600 font-medium">Total Parties</p>
                </div>
                <p className="text-3xl font-bold text-blue-900">{stats.totalParties}</p>
                <p className="text-xs text-blue-600 mt-1">All registered parties</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">Active Parties</p>
                </div>
                <p className="text-3xl font-bold text-green-900">{stats.activeParties}</p>
                <p className="text-xs text-green-600 mt-1">
                  {((stats.activeParties / stats.totalParties) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-xl">
                <Activity className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <p className="text-sm text-orange-600 font-medium">Total Outstanding</p>
                </div>
                <p className="text-3xl font-bold text-orange-900">
                  {formatCurrency(stats.totalOutstanding)}
                </p>
                <p className="text-xs text-orange-600 mt-1">Pending payments</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-xl">
                <DollarSign className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <p className="text-sm text-purple-600 font-medium">Total Credit Limit</p>
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {formatCurrency(stats.totalCreditLimit)}
                </p>
                <p className="text-xs text-purple-600 mt-1">Available credit</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, contact, phone, or GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
          
          <div className="flex gap-3">
            <Button
              variant={activeFilter === 'all' ? 'primary' : 'ghost'}
              onClick={() => setActiveFilter('all')}
              size="sm"
            >
              All ({parties.length})
            </Button>
            <Button
              variant={activeFilter === 'active' ? 'primary' : 'ghost'}
              onClick={() => setActiveFilter('active')}
              size="sm"
              icon={UserCheck}
            >
              Active ({parties.filter(p => p.activeStatus).length})
            </Button>
            <Button
              variant={activeFilter === 'inactive' ? 'primary' : 'ghost'}
              onClick={() => setActiveFilter('inactive')}
              size="sm"
              icon={UserX}
            >
              Inactive ({parties.filter(p => !p.activeStatus).length})
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

      {/* Enhanced Party List */}
      <Card>
        {filteredAndSortedParties.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">
                {search || activeFilter !== 'all' ? 'No parties found' : 'No parties yet'}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                {search || activeFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Create your first party to get started'
                }
              </p>
            </div>
            {hasPermission('production:create') && !search && activeFilter === 'all' && (
              <Button icon={Plus} onClick={() => setShowModal(true)}>
                Add Your First Party
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Party Details</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Contact Info</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Terms</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Financial</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedParties.map((party, index) => {
                  const creditUtilization = getCreditUtilization(party);
                  const isOverLimit = party.currentOutstanding > party.creditLimit;
                  const isNearLimit = creditUtilization > 80 && !isOverLimit;

                  return (
                    <tr 
                      key={party._id} 
                      className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            party.activeStatus ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Building2 className={`w-5 h-5 ${
                              party.activeStatus ? 'text-green-600' : 'text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{party.partyName}</p>
                            {party.gstNumber && (
                              <p className="text-xs text-gray-500 font-mono mt-0.5">
                                GST: {party.gstNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {party.contactPerson && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-700">{party.contactPerson}</span>
                            </div>
                          )}
                          {party.phone && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-700">{party.phone}</span>
                            </div>
                          )}
                          {party.email && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-700 truncate max-w-[200px]">
                                {party.email}
                              </span>
                            </div>
                          )}
                          {!party.contactPerson && !party.phone && !party.email && (
                            <span className="text-sm text-gray-400">No contact info</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-sm text-gray-700">
                              {party.paymentTermsDays} days
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-purple-500" />
                            <span className="text-sm text-gray-700">
                              {party.interestPercentPerDay}%/day
                            </span>
                            <Badge variant="default" size="sm">
                              {party.interestType}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">Credit Limit</span>
                              <span className="font-semibold text-gray-700">
                                {formatCurrency(party.creditLimit)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Outstanding</span>
                              <span className={`font-semibold ${
                                party.currentOutstanding > 0 ? 'text-orange-600' : 'text-gray-700'
                              }`}>
                                {formatCurrency(party.currentOutstanding)}
                              </span>
                            </div>
                          </div>
                          
                          {party.creditLimit > 0 && (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-500">Utilization</span>
                                <span className={`font-semibold ${
                                  isOverLimit ? 'text-red-600' :
                                  isNearLimit ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  {creditUtilization}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isOverLimit ? 'bg-red-500' :
                                    isNearLimit ? 'bg-orange-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-4 text-center">
                        {party.activeStatus ? (
                          <Badge variant="success" icon={UserCheck}>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default" icon={UserX}>
                            Inactive
                          </Badge>
                        )}
                      </td>
                      
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => navigate(`/parties/${party._id}`)}
                            title="View Details"
                          />
                          {hasPermission('production:edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleEdit(party)}
                              title="Edit Party"
                            />
                          )}
                          {hasPermission('production:delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteConfirm(party)}
                              className="text-red-600 hover:bg-red-50"
                              title="Delete Party"
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

      {/* Enhanced Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              {editingParty ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
            </div>
            <span>{editingParty ? 'Edit Party' : 'Add New Party'}</span>
          </div>
        }
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Party Name"
                  value={formData.partyName}
                  onChange={(e) => {
                    setFormData({ ...formData, partyName: e.target.value });
                    setErrors({ ...errors, partyName: '' });
                  }}
                  required
                  placeholder="Enter party/business name"
                  icon={Building2}
                  error={errors.partyName}
                />
              </div>
              
              <Input
                label="Contact Person"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Contact person name"
                icon={User}
              />
              
              <Input
                label="GST Number"
                value={formData.gstNumber}
                onChange={(e) => {
                  setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() });
                  setErrors({ ...errors, gstNumber: '' });
                }}
                placeholder="15-digit GST number"
                icon={FileText}
                error={errors.gstNumber}
                maxLength={15}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                icon={Phone}
              />
              
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setErrors({ ...errors, email: '' });
                }}
                placeholder="email@example.com"
                icon={Mail}
                error={errors.email}
              />
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>Address</span>
                  </div>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="Enter full business address"
                />
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              Financial Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Payment Terms (Days)"
                type="number"
                value={formData.paymentTermsDays}
                onChange={(e) => {
                  setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 0 });
                  setErrors({ ...errors, paymentTermsDays: '' });
                }}
                required
                min="0"
                placeholder="Number of days"
                icon={Calendar}
                error={errors.paymentTermsDays}
              />
              
              <Input
                label="Credit Limit"
                type="number"
                step="0.01"
                value={formData.creditLimit}
                onChange={(e) => {
                  setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 });
                  setErrors({ ...errors, creditLimit: '' });
                }}
                min="0"
                placeholder="Maximum credit allowed"
                icon={CreditCard}
                error={errors.creditLimit}
              />
              
              <Input
                label="Interest Rate (% per day)"
                type="number"
                step="0.01"
                value={formData.interestPercentPerDay}
                onChange={(e) => {
                  setFormData({ ...formData, interestPercentPerDay: parseFloat(e.target.value) || 0 });
                  setErrors({ ...errors, interestPercentPerDay: '' });
                }}
                min="0"
                placeholder="Daily interest rate"
                icon={Percent}
                error={errors.interestPercentPerDay}
              />
              
              <Select
                label="Interest Type"
                name="interestType"
                value={formData.interestType}
                onChange={(e) => setFormData({ ...formData, interestType: e.target.value })}
                options={interestTypeOptions}
                required
                icon={TrendingUp}
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.activeStatus}
                onChange={(e) => setFormData({ ...formData, activeStatus: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Active Status</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enable this party for new transactions
                </p>
              </div>
            </label>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={handleModalClose} type="button">
              Cancel
            </Button>
            <Button type="submit" icon={editingParty ? Edit2 : Plus}>
              {editingParty ? 'Update Party' : 'Create Party'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, party: null })}
        title="Delete Party"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Are you sure you want to delete this party?
                </p>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>
              </div>
            </div>
          </div>

          {deleteConfirm.party && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Party to be deleted:</p>
              <p className="font-semibold text-gray-900">{deleteConfirm.party.partyName}</p>
              {deleteConfirm.party.currentOutstanding > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ Outstanding amount: {formatCurrency(deleteConfirm.party.currentOutstanding)}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="ghost" 
              onClick={() => setDeleteConfirm({ show: false, party: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              icon={Trash2}
              onClick={handleDelete}
            >
              Delete Party
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PartyManagement;