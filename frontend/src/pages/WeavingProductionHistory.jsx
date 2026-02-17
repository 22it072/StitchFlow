// frontend/src/pages/WeavingProductionHistory.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Factory,
  TrendingUp,
  Eye,
  Edit2,
  Trash2,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Package,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import { weavingProductionAPI } from '../services/weavingApi';
import { useCompany } from '../context/CompanyContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const WeavingProductionHistory = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { hasPermission } = usePermissions();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (activeCompany?._id) {
      fetchEntries();
    }
  }, [activeCompany?._id, search, shiftFilter, dateFrom, dateTo, sortBy]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        shift: shiftFilter !== 'all' ? shiftFilter : undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        sort: sortBy,
      };

      const [entriesRes, statsRes] = await Promise.all([
        weavingProductionAPI.getAll(params, activeCompany?._id),
        weavingProductionAPI.getStats(activeCompany?._id),
      ]);

      setEntries(entriesRes.data.entries || []);
      setStats(statsRes.data.stats || null);
    } catch (error) {
      console.error('Error fetching production entries:', error);
      toast.error('Failed to load production entries');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getShiftBadge = (shift) => {
    const variants = {
      Day: 'warning',
      Night: 'info',
      General: 'default',
    };
    return variants[shift] || 'default';
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 75) return 'text-blue-600';
    if (efficiency >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Shift filter options
  const shiftOptions = [
    { value: 'all', label: 'All Shifts' },
    { value: 'Day', label: 'Day Shift' },
    { value: 'Night', label: 'Night Shift' },
    { value: 'General', label: 'General' },
  ];

  // Sort options
  const sortOptions = [
    { value: 'date-desc', label: 'Date (Newest First)' },
    { value: 'date-asc', label: 'Date (Oldest First)' },
    { value: 'metersProduced', label: 'Production (High to Low)' },
    { value: 'efficiency', label: 'Efficiency (High to Low)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-6 h-6 text-indigo-600 animate-pulse" />
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
            <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl">
              <Activity className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Weaving Production History</h1>
              <p className="text-gray-500 mt-1">View and manage daily production entries</p>
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
              icon={Factory}
              onClick={() => navigate('/weaving/production/new')}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
            >
              New Entry
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium mb-1">Total Production</p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.overall?.totalMeters?.toFixed(0) || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">meters</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <Target className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium mb-1">Avg Efficiency</p>
                <p className="text-3xl font-bold text-green-900">
                  {stats.overall?.avgEfficiency?.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-green-600 mt-1">productivity</p>
              </div>
              <div className="p-3 bg-green-200 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-purple-900">
                  {stats.overall?.totalHours?.toFixed(0) || 0}
                </p>
                <p className="text-xs text-purple-600 mt-1">working hours</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <Clock className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium mb-1">Total Entries</p>
                <p className="text-3xl font-bold text-amber-900">{entries.length}</p>
                <p className="text-xs text-amber-600 mt-1">production logs</p>
              </div>
              <div className="p-3 bg-amber-200 rounded-xl">
                <Activity className="w-6 h-6 text-amber-700" />
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
              placeholder="Search by operator, loom, or set..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              icon={Calendar}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              icon={Calendar}
            />

            <Select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              options={shiftOptions}
            />

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={sortOptions}
              icon={Filter}
            />
          </div>
        </div>
      </Card>

      {/* Entries Table */}
      <Card>
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-2">No production entries found</p>
            <p className="text-sm text-gray-400 mb-6">
              {search || shiftFilter !== 'all' || dateFrom || dateTo
                ? 'Try adjusting your filters'
                : 'Create your first production entry to get started'}
            </p>
            {hasPermission('production:create') && (
              <Button
                icon={Factory}
                onClick={() => navigate('/weaving/production/new')}
              >
                Create First Entry
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Date & Shift</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Operator</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Loom & Set</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Production</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Time</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Efficiency</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr
                    key={entry._id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                    onClick={() => navigate(`/weaving/production/${entry._id}`)}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatDate(entry.entryDate)}
                        </p>
                        <Badge variant={getShiftBadge(entry.shift)} className="mt-1">
                          {entry.shift}
                        </Badge>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-indigo-700">
                            {entry.operatorName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">{entry.operatorName}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Factory className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-gray-700">
                            Loom {entry.loomId?.loomNumber || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Package className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-gray-700">
                            Set {entry.setId?.setNumber || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-semibold text-gray-900">
                            {entry.metersProduced} m
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {entry.metersPerHour?.toFixed(1)} m/hr
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700">
                            {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {entry.totalHours?.toFixed(1)} hrs
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className={`text-lg font-bold ${getEfficiencyColor(entry.efficiency)}`}>
                        {entry.efficiency?.toFixed(1)}%
                      </div>
                      {entry.defects?.count > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600">
                            {entry.defects.count} defects
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => navigate(`/weaving/production/${entry._id}`)}
                          title="View Details"
                        />
                        {hasPermission('production:edit') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit2}
                            onClick={() => navigate(`/weaving/production/${entry._id}/edit`)}
                            title="Edit Entry"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WeavingProductionHistory;