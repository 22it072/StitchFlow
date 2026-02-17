// frontend/src/pages/ProductionEntryDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Factory,
  PackageCheck,
  User,
  TrendingUp,
  Target,
  AlertTriangle,
  Zap,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  Download,
  Printer,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { weavingProductionAPI } from '../services/weavingApi';
import { useCompany } from '../context/CompanyContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const ProductionEntryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { hasPermission } = usePermissions();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeCompany?._id && id) {
      fetchEntry();
    }
  }, [activeCompany?._id, id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const response = await weavingProductionAPI.getOne(id, activeCompany?._id);
      setEntry(response.data.entry);
      console.log('Production entry:', response.data.entry);
    } catch (error) {
      console.error('Error fetching production entry:', error);
      toast.error('Failed to load production entry');
      navigate('/weaving/production');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await weavingProductionAPI.delete(id, activeCompany?._id);
      toast.success('Production entry deleted successfully');
      navigate('/weaving/production');
    } catch (error) {
      console.error('Error deleting production entry:', error);
      toast.error(error.response?.data?.message || 'Failed to delete production entry');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    navigate(`/weaving/production/${id}/edit`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Export logic - you can implement CSV or PDF export
    toast.info('Export functionality coming soon');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getShiftBadgeColor = (shift) => {
    const colors = {
      Day: 'bg-amber-100 text-amber-700 border-amber-200',
      Night: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      General: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[shift] || colors.General;
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 90) return 'text-green-600 bg-green-50';
    if (efficiency >= 75) return 'text-blue-600 bg-blue-50';
    if (efficiency >= 60) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

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

  if (!entry) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Entry Not Found</h2>
        <p className="text-gray-600 mb-6">The production entry you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/weaving/production')}>
          Back to Production List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/weaving/production')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Entry Details</h1>
            <p className="text-gray-500 mt-1">
              {formatDate(entry.entryDate)} - {entry.shift} Shift
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" icon={Download} onClick={handleExport}>
            Export
          </Button>
          <Button variant="ghost" icon={Printer} onClick={handlePrint}>
            Print
          </Button>
          {hasPermission('production:edit') && (
            <Button variant="secondary" icon={Edit2} onClick={handleEdit}>
              Edit
            </Button>
          )}
          {hasPermission('production:delete') && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => setDeleteConfirm(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">Meters Produced</p>
              <p className="text-3xl font-bold text-blue-900">{entry.metersProduced}</p>
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
              <p className="text-sm text-green-600 font-medium mb-1">Efficiency</p>
              <p className="text-3xl font-bold text-green-900">{entry.efficiency.toFixed(1)}%</p>
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
              <p className="text-sm text-purple-600 font-medium mb-1">Production Rate</p>
              <p className="text-3xl font-bold text-purple-900">{entry.metersPerHour.toFixed(1)}</p>
              <p className="text-xs text-purple-600 mt-1">meters/hour</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-xl">
              <Activity className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium mb-1">Total Hours</p>
              <p className="text-3xl font-bold text-amber-900">{entry.totalHours.toFixed(1)}</p>
              <p className="text-xs text-amber-600 mt-1">working hours</p>
            </div>
            <div className="p-3 bg-amber-200 rounded-xl">
              <Clock className="w-6 h-6 text-amber-700" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Entry Date</label>
                <p className="font-medium text-gray-900">{formatDate(entry.entryDate)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Shift</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-lg border font-medium ${getShiftBadgeColor(entry.shift)}`}>
                  {entry.shift}
                </span>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Operator Name</label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{entry.operatorName}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Created By</label>
                <p className="font-medium text-gray-900">
                  {entry.createdBy?.name || 'Unknown'}
                </p>
              </div>
            </div>
          </Card>

          {/* Loom & Set Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Factory className="w-5 h-5 text-indigo-600" />
              Loom & Set Information
            </h3>
            <div className="space-y-4">
              {/* Loom */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Factory className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-semibold text-gray-900">Loom Details</h4>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Loom Number:</span>
                    <p className="font-medium text-gray-900 mt-1">
                      {entry.loomId?.loomNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Loom Type:</span>
                    <p className="font-medium text-gray-900 mt-1">
                      {entry.loomId?.loomType || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Set */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Weaving Set Details</h4>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Set Number:</span>
                    <p className="font-medium text-gray-900 mt-1">
                      {entry.setId?.setNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Quality Name:</span>
                    <p className="font-medium text-gray-900 mt-1">
                      {entry.setId?.qualityName || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Beam (if exists) */}
              {entry.beamId && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-gray-900">Beam Details</h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Beam Number:</span>
                      <p className="font-medium text-gray-900 mt-1">
                        {entry.beamId?.beamNumber || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Length Used:</span>
                      <p className="font-medium text-gray-900 mt-1">
                        {entry.beamLengthUsed?.toFixed(2) || 0} m
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Remaining Length:</span>
                      <p className="font-medium text-gray-900 mt-1">
                        {entry.beamId?.remainingLength?.toFixed(2) || 0} m
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Production Metrics */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Production Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Start Time</p>
                <p className="text-xl font-bold text-blue-900">{formatTime(entry.startTime)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <p className="text-sm text-purple-600 mb-1">End Time</p>
                <p className="text-xl font-bold text-purple-900">{formatTime(entry.endTime)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <p className="text-sm text-green-600 mb-1">Total Working Hours</p>
                <p className="text-xl font-bold text-green-900">{entry.totalHours.toFixed(2)} hrs</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-600 mb-1">Meters Produced</p>
                <p className="text-xl font-bold text-amber-900">{entry.metersProduced} m</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                <p className="text-sm text-indigo-600 mb-1">Production Rate</p>
                <p className="text-xl font-bold text-indigo-900">{entry.metersPerHour.toFixed(2)} m/hr</p>
              </div>
              <div className={`p-4 rounded-xl border ${getEfficiencyColor(entry.efficiency)}`}>
                <p className="text-sm mb-1">Efficiency</p>
                <p className="text-xl font-bold">{entry.efficiency.toFixed(1)}%</p>
              </div>
              {entry.actualPicks > 0 && (
                <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl border border-pink-200">
                  <p className="text-sm text-pink-600 mb-1">Actual Picks</p>
                  <p className="text-xl font-bold text-pink-900">{entry.actualPicks.toLocaleString()}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Quality & Defects */}
          {(entry.defects?.count > 0 || entry.defects?.types?.length > 0) && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Quality Tracking
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-600 mb-1">Total Defects</p>
                    <p className="text-2xl font-bold text-amber-900">{entry.defects.count}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-sm text-red-600 mb-1">Defect Types</p>
                    <p className="text-2xl font-bold text-red-900">
                      {entry.defects.types?.length || 0}
                    </p>
                  </div>
                </div>

                {entry.defects.types && entry.defects.types.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500 block mb-2">Defect Types</label>
                    <div className="flex flex-wrap gap-2">
                      {entry.defects.types.map((type, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-lg border border-amber-200 text-sm font-medium"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.defects.description && (
                  <div>
                    <label className="text-sm text-gray-500 block mb-2">Defect Description</label>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-gray-900">{entry.defects.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Downtime */}
          {entry.loomStoppageTime > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-600" />
                Downtime Tracking
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-sm text-red-600 mb-1">Stoppage Time</p>
                    <p className="text-2xl font-bold text-red-900">
                      {entry.loomStoppageTime} min
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {(entry.loomStoppageTime / 60).toFixed(2)} hours
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-sm text-orange-600 mb-1">Stoppage Reason</p>
                    <p className="text-xl font-bold text-orange-900">{entry.stoppageReason}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Remarks */}
          {entry.remarks && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Remarks
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap">{entry.remarks}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Summary */}
          <Card className="sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Performance Summary
            </h3>
            <div className="space-y-4">
              {/* Efficiency Gauge */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Overall Efficiency</span>
                  <span className="text-sm font-bold text-gray-900">
                    {entry.efficiency.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      entry.efficiency >= 90
                        ? 'bg-green-500'
                        : entry.efficiency >= 75
                        ? 'bg-blue-500'
                        : entry.efficiency >= 60
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(entry.efficiency, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Productive Time</span>
                  <span className="text-sm font-bold text-green-600">
                    {(entry.totalHours - (entry.loomStoppageTime || 0) / 60).toFixed(2)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Downtime</span>
                  <span className="text-sm font-bold text-red-600">
                    {((entry.loomStoppageTime || 0) / 60).toFixed(2)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Defect Rate</span>
                  <span className="text-sm font-bold text-amber-600">
                    {entry.metersProduced > 0
                      ? ((entry.defects?.count || 0) / entry.metersProduced * 100).toFixed(2)
                      : 0}%
                  </span>
                </div>
              </div>

              {/* Quality Score */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Quality Score</span>
                  <span className="text-sm font-bold text-gray-900">
                    {entry.defects?.count > 0
                      ? Math.max(0, 100 - (entry.defects.count / entry.metersProduced * 100)).toFixed(0)
                      : 100}
                    /100
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {entry.defects?.count === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : entry.defects?.count < 5 ? (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  ) : entry.defects?.count < 10 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {entry.defects?.count === 0
                      ? 'Excellent Quality'
                      : entry.defects?.count < 5
                      ? 'Good Quality'
                      : entry.defects?.count < 10
                      ? 'Acceptable Quality'
                      : 'Needs Improvement'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Metadata */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Entry Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">Created At</span>
                <span className="font-medium text-gray-900">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Last Updated</span>
                <span className="font-medium text-gray-900">
                  {formatDateTime(entry.updatedAt)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Entry ID</span>
                <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  {entry._id}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Production Entry"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Are you sure you want to delete this production entry?
                </p>
                <p className="text-sm text-red-700">
                  This action cannot be undone. The produced quantity will be subtracted from the weaving set,
                  and all related data will be permanently removed.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Entry to be deleted:</p>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">
                {formatDate(entry.entryDate)} - {entry.shift} Shift
              </p>
              <p className="text-sm text-gray-700">
                Operator: {entry.operatorName}
              </p>
              <p className="text-sm text-gray-700">
                Production: {entry.metersProduced} meters
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleDelete}
              loading={deleting}
            >
              Delete Entry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionEntryDetails;