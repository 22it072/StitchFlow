// frontend/src/pages/ChallanList.jsx (Enhanced)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  Package,
  Users,
  ChevronDown,
  Grid,
  List,
  PieChart,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import { challanAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { formatCurrency, getDaysOverdue } from '../utils/challanCalculations';
import toast from 'react-hot-toast';

const ChallanList = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedChallans, setSelectedChallans] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    fetchChallans();
    fetchStats();
  }, [search, statusFilter, dateRange, sortBy, sortOrder]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
        days: dateRange,
        sortBy,
        sortOrder,
      };
      const response = await challanAPI.getAll(params);
      setChallans(response.data.challans);
    } catch (error) {
      console.error('Error fetching challans:', error);
      toast.error('Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await challanAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challan?')) {
      return;
    }
    
    try {
      await challanAPI.delete(id);
      toast.success('Challan deleted successfully');
      fetchChallans();
      fetchStats();
    } catch (error) {
      console.error('Error deleting challan:', error);
      toast.error(error.response?.data?.message || 'Failed to delete challan');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedChallans.length} challans?`)) {
      return;
    }

    try {
      await Promise.all(selectedChallans.map(id => challanAPI.delete(id)));
      toast.success(`${selectedChallans.length} challans deleted successfully`);
      setSelectedChallans([]);
      setShowBulkActions(false);
      fetchChallans();
      fetchStats();
    } catch (error) {
      console.error('Error deleting challans:', error);
      toast.error('Failed to delete some challans');
    }
  };

  const handleExport = () => {
    const data = challans.map(c => ({
      'Challan Number': c.challanNumber,
      'Party Name': c.party?.partyName,
      'Issue Date': new Date(c.issueDate).toLocaleDateString(),
      'Due Date': new Date(c.dueDate).toLocaleDateString(),
      'Amount': formatCurrency(c.totals?.subtotalAmount),
      'Interest': formatCurrency(c.currentInterest || 0),
      'Total Payable': formatCurrency(c.totalPayable),
      'Status': c.status,
      'Items': c.items?.length || 0,
    }));

    const csv = convertToCSV(data);
    downloadCSV(csv, `challans_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export started');
  };

  const convertToCSV = (data) => {
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => obj[header]).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (selectedChallans.length === challans.length) {
      setSelectedChallans([]);
      setShowBulkActions(false);
    } else {
      setSelectedChallans(challans.map(c => c._id));
      setShowBulkActions(true);
    }
  };

  const toggleSelect = (id) => {
    setSelectedChallans(prev => {
      const newSelected = prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id];
      setShowBulkActions(newSelected.length > 0);
      return newSelected;
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      Open: { variant: 'warning', icon: Clock, label: 'Open' },
      Paid: { variant: 'success', icon: CheckCircle, label: 'Paid' },
      Overdue: { variant: 'danger', icon: AlertCircle, label: 'Overdue' },
      Cancelled: { variant: 'default', icon: XCircle, label: 'Cancelled' },
    };
    return configs[status] || configs.Open;
  };

  if (loading && challans.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Challans</h1>
          <p className="text-gray-500 mt-1">Track and manage delivery challans with interest</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button 
            variant="ghost" 
            icon={Download}
            onClick={handleExport}
            disabled={challans.length === 0}
          >
            Export
          </Button>
          {hasPermission('production:create') && (
            <Button
              icon={Plus}
              onClick={() => navigate('/challans/new')}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
            >
              New Challan
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Challans</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalChallans || 0}</p>
                <p className="text-xs text-blue-600 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <FileText className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">Paid</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {stats.stats?.find(s => s._id === 'Paid')?.count || 0}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {formatCurrency(stats.stats?.find(s => s._id === 'Paid')?.totalAmount || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Open</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {stats.stats?.find(s => s._id === 'Open')?.count || 0}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {formatCurrency(stats.stats?.find(s => s._id === 'Open')?.totalAmount || 0)}
                </p>
              </div>
              <div className="p-3 bg-amber-200 rounded-xl">
                <Clock className="w-6 h-6 text-amber-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {stats.overdueCount || 0}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {formatCurrency(stats.overdueAmount || 0)}
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium">Total Value</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {formatCurrency(stats.totalValue || 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Including interest
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <DollarSign className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <Card className="sticky top-20 z-10">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by challan number, party name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last year</option>
                <option value="all">All time</option>
              </select>

              <Button
                variant={showFilters ? 'primary' : 'ghost'}
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>

              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'Open', 'Paid', 'Overdue', 'Cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          statusFilter === status
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'all' ? 'All' : status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="createdAt">Created Date</option>
                    <option value="issueDate">Issue Date</option>
                    <option value="dueDate">Due Date</option>
                    <option value="totalPayable">Amount</option>
                    <option value="challanNumber">Challan Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    icon={RefreshCw}
                    onClick={fetchChallans}
                    size="sm"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="sticky top-40 z-10 bg-indigo-50 rounded-xl p-4 border border-indigo-200 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedChallans.length === challans.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-indigo-900">
                {selectedChallans.length} challans selected
              </span>
            </div>
            <div className="flex gap-2">
              {hasPermission('production:delete') && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedChallans([]);
                  setShowBulkActions(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content - Table View */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedChallans.length === challans.length && challans.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Challan Details</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Party</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Dates</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Interest</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-2">No challans found</p>
                        <p className="text-sm text-gray-400">Create your first challan to get started</p>
                        {hasPermission('production:create') && (
                          <Button
                            icon={Plus}
                            onClick={() => navigate('/challans/new')}
                            className="mt-4"
                          >
                            New Challan
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  challans.map((challan) => {
                    const daysOverdue = getDaysOverdue(challan.dueDate);
                    const statusConfig = getStatusConfig(challan.status);
                    
                    return (
                      <tr 
                        key={challan._id} 
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/challans/${challan._id}`)}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedChallans.includes(challan._id)}
                            onChange={() => toggleSelect(challan._id)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{challan.challanNumber}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Package className="w-3 h-3" />
                            {challan.items?.length || 0} items
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{challan.party?.partyName}</div>
                          <div className="text-xs text-gray-500">{challan.party?.contactPerson || 'No contact'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {new Date(challan.issueDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Due: {new Date(challan.dueDate).toLocaleDateString()}
                          </div>
                          {daysOverdue > 0 && challan.status !== 'Paid' && (
                            <div className="text-xs text-red-600 font-medium mt-1">
                              {daysOverdue} days overdue
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(challan.totals?.subtotalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {challan.currentInterest > 0 ? (
                            <span className="text-red-600 font-medium">
                              +{formatCurrency(challan.currentInterest)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                          {formatCurrency(challan.totalPayable)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center">
                            <Badge 
                              variant={statusConfig.variant} 
                              icon={statusConfig.icon}
                              size="sm"
                            >
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() => navigate(`/challans/${challan._id}`)}
                              className="hover:bg-indigo-50"
                            />
                            {hasPermission('production:delete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={() => handleDelete(challan._id)}
                                className="hover:bg-red-50 text-red-600"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Content - Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challans.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="flex flex-col items-center">
                <FileText className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">No challans found</p>
                <p className="text-sm text-gray-400">Create your first challan to get started</p>
              </div>
            </div>
          ) : (
            challans.map((challan) => {
              const daysOverdue = getDaysOverdue(challan.dueDate);
              const statusConfig = getStatusConfig(challan.status);
              
              return (
                <Card 
                  key={challan._id}
                  hover
                  className="cursor-pointer group"
                  onClick={() => navigate(`/challans/${challan._id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{challan.challanNumber}</h3>
                        <Badge variant={statusConfig.variant} size="sm">
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{challan.party?.partyName}</p>
                    </div>
                    <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Issue Date:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(challan.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Due Date:</span>
                      <span className={`font-medium ${daysOverdue > 0 && challan.status !== 'Paid' ? 'text-red-600' : 'text-gray-900'}`}>
                        {new Date(challan.dueDate).toLocaleDateString()}
                        {daysOverdue > 0 && challan.status !== 'Paid' && (
                          <span className="ml-2 text-xs">({daysOverdue} days)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Items:</span>
                      <span className="font-medium text-gray-900">{challan.items?.length || 0}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">Amount:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(challan.totals?.subtotalAmount)}
                      </span>
                    </div>
                    {challan.currentInterest > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Interest:</span>
                        <span className="font-semibold text-red-600">
                          +{formatCurrency(challan.currentInterest)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span className="text-gray-700">Total:</span>
                      <span className="text-indigo-600">
                        {formatCurrency(challan.totalPayable)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => navigate(`/challans/${challan._id}`)}
                    >
                      View
                    </Button>
                    {hasPermission('production:delete') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(challan._id)}
                        className="text-red-600"
                      />
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ChallanList;