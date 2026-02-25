import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Factory,
  Gauge,
  Calendar,
  Wrench,
  User,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
  RefreshCw,
  Power,
  Settings,
  BarChart3,
  Hash,
  Info,
  ChevronRight,
  Package,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Select from '../components/common/Select';
import { loomAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useCompany } from '../context/CompanyContext';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getStatusConfig = (status) => {
  const map = {
    Active:             { variant: 'success', icon: CheckCircle,   bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  dot: 'bg-green-500'  },
    Idle:               { variant: 'warning', icon: Clock,         bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700',  dot: 'bg-amber-500'  },
    'Under Maintenance':{ variant: 'info',    icon: Wrench,        bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-700',   dot: 'bg-blue-500'   },
    Breakdown:          { variant: 'danger',  icon: AlertTriangle, bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    dot: 'bg-red-500'    },
  };
  return map[status] || { variant: 'default', icon: Activity, bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400' };
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const isMaintenanceOverdue = (date) => {
  if (!date) return false;
  return new Date() > new Date(date);
};

const daysDiff = (date) => {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Coloured info tile used in the specs grid */
const InfoTile = ({ icon: Icon, label, value, sub, colorClass = 'text-indigo-600', bgClass = 'bg-indigo-50' }) => (
  <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
    <div className={`p-2.5 rounded-lg ${bgClass} flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${colorClass}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900 text-sm leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/** Single production row in the recent-history table */
const ProductionRow = ({ record }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="py-3 px-4 text-sm text-gray-700">
      {formatDate(record.entryDate || record.createdAt)}
    </td>
    <td className="py-3 px-4 text-sm text-gray-700">
      {record.setId?.setNumber || record.setNumber || '—'}
    </td>
    <td className="py-3 px-4 text-sm text-gray-700">
      {record.setId?.qualityName || record.qualityName || '—'}
    </td>
    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
      {record.fabricProduced ?? record.metersProduced ?? '—'} m
    </td>
    <td className="py-3 px-4 text-sm text-right text-gray-600">
      {record.efficiency != null ? `${record.efficiency.toFixed(1)}%` : '—'}
    </td>
  </tr>
);

// ─── Status Change Modal ─────────────────────────────────────────────────────

const StatusModal = ({ isOpen, onClose, currentStatus, onConfirm, loading }) => {
  const [selected, setSelected] = useState(currentStatus);

  useEffect(() => { setSelected(currentStatus); }, [currentStatus]);

  const options = [
    { value: 'Active',             label: 'Active' },
    { value: 'Idle',               label: 'Idle' },
    { value: 'Under Maintenance',  label: 'Under Maintenance' },
    { value: 'Breakdown',          label: 'Breakdown' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Loom Status" size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Select the new operational status for this loom.
        </p>

        <div className="space-y-2">
          {options.map((opt) => {
            const cfg = getStatusConfig(opt.value);
            const Icon = cfg.icon;
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                  ${active
                    ? `${cfg.border} ${cfg.bg}`
                    : 'border-gray-100 hover:border-gray-200 bg-white'}`}
              >
                <div className={`p-1.5 rounded-lg ${active ? cfg.bg : 'bg-gray-100'}`}>
                  <Icon className={`w-4 h-4 ${active ? cfg.text : 'text-gray-500'}`} />
                </div>
                <span className={`font-medium text-sm ${active ? cfg.text : 'text-gray-700'}`}>
                  {opt.label}
                </span>
                {active && (
                  <CheckCircle className={`w-4 h-4 ml-auto ${cfg.text}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button
            onClick={() => onConfirm(selected)}
            loading={loading}
            disabled={selected === currentStatus}
          >
            Update Status
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const LoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { activeCompany } = useCompany();

  const [loom, setLoom]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchLoom = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await loomAPI.getOne(id, activeCompany?._id);
      setLoom(res.data.loom || res.data);
    } catch (err) {
      console.error('Fetch loom error:', err);
      if (err.response?.status === 404) {
        toast.error('Loom not found');
        navigate('/weaving/looms');
      } else {
        toast.error('Failed to load loom details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoom(); }, [id, activeCompany?._id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLoom(true);
    setRefreshing(false);
    toast.success('Refreshed');
  };

  // ── Status change ──────────────────────────────────────────────────────────

  const handleStatusConfirm = async (newStatus) => {
    setStatusLoading(true);
    try {
      await loomAPI.updateStatus(id, newStatus, activeCompany?._id);
      toast.success(`Status updated to ${newStatus}`);
      setStatusModal(false);
      fetchLoom(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await loomAPI.delete(id, activeCompany?._id);
      toast.success('Loom deleted successfully');
      navigate('/weaving/looms');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete loom');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!loom) return null;

  // ── Derived values ─────────────────────────────────────────────────────────

  const statusCfg      = getStatusConfig(loom.status);
  const StatusIcon     = statusCfg.icon;
  const maintenanceDays = daysDiff(loom.nextMaintenanceDate);
  const isOverdue      = isMaintenanceOverdue(loom.nextMaintenanceDate);
  const recentProduction = loom.recentProduction || [];

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb / Back ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate('/weaving/looms')}
          className="hover:text-indigo-600 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Loom Management
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{loom.loomNumber}</span>
      </div>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Loom icon badge */}
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Factory className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{loom.loomNumber}</h1>
              {/* Live status pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                  ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                {loom.status}
              </span>
              {/* Maintenance overdue badge */}
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                  text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle className="w-3 h-3" />
                  Maintenance Overdue
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1 text-sm">
              {loom.loomType} Loom
              {loom.loomMake && ` · ${loom.loomMake}`}
              {loom.location && ` · ${loom.location}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>

          {hasPermission('production:edit') && (
            <Button
              variant="outline"
              size="sm"
              icon={Power}
              onClick={() => setStatusModal(true)}
            >
              Change Status
            </Button>
          )}

          {hasPermission('production:edit') && (
            <Button
              variant="outline"
              size="sm"
              icon={Edit2}
              onClick={() => navigate('/weaving/looms', { state: { editLoomId: loom._id } })}
            >
              Edit
            </Button>
          )}

          {hasPermission('production:delete') && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => setDeleteModal(true)}
              className="text-red-600 hover:bg-red-50 border border-red-200"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ── Maintenance Alert Banner ───────────────────────────────────────── */}
      {loom.nextMaintenanceDate && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border
            ${isOverdue
              ? 'bg-red-50 border-red-200'
              : maintenanceDays <= 7
                ? 'bg-amber-50 border-amber-200'
                : 'bg-blue-50 border-blue-200'}`}
        >
          <Wrench
            className={`w-5 h-5 mt-0.5 flex-shrink-0
              ${isOverdue ? 'text-red-600' : maintenanceDays <= 7 ? 'text-amber-600' : 'text-blue-600'}`}
          />
          <div>
            <p
              className={`text-sm font-semibold
                ${isOverdue ? 'text-red-900' : maintenanceDays <= 7 ? 'text-amber-900' : 'text-blue-900'}`}
            >
              {isOverdue
                ? `Maintenance overdue by ${Math.abs(maintenanceDays)} day${Math.abs(maintenanceDays) !== 1 ? 's' : ''}`
                : maintenanceDays === 0
                  ? 'Maintenance due today'
                  : `Next maintenance in ${maintenanceDays} day${maintenanceDays !== 1 ? 's' : ''}`}
            </p>
            <p
              className={`text-xs mt-0.5
                ${isOverdue ? 'text-red-700' : maintenanceDays <= 7 ? 'text-amber-700' : 'text-blue-700'}`}
            >
              Scheduled: {formatDate(loom.nextMaintenanceDate)}
            </p>
          </div>
        </div>
      )}

      {/* ── Quick Stats Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoTile
          icon={Gauge}
          label="Reed Width"
          value={`${loom.reedWidth} ${loom.reedWidthUnit}`}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <InfoTile
          icon={TrendingUp}
          label="Speed (RPM)"
          value={`${loom.rpm} rpm`}
          colorClass="text-violet-600"
          bgClass="bg-violet-50"
        />
        <InfoTile
          icon={Activity}
          label="Running Hours"
          value={`${loom.totalRunningHours ?? 0} hrs`}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <InfoTile
          icon={StatusIcon}
          label="Current Status"
          value={loom.status}
          colorClass={statusCfg.text}
          bgClass={statusCfg.bg}
        />
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Information */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" />
                Basic Information
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">

              <div>
                <p className="text-xs text-gray-400 mb-1">Loom Number</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-gray-400" />
                  {loom.loomNumber}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Loom Type</p>
                <p className="font-medium text-gray-900">{loom.loomType}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Manufacturer / Make</p>
                <p className="font-medium text-gray-900">{loom.loomMake || '—'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Location</p>
                <p className="font-medium text-gray-900 flex items-center gap-1.5">
                  {loom.location
                    ? <><MapPin className="w-3.5 h-3.5 text-gray-400" />{loom.location}</>
                    : '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Operator Assigned</p>
                <p className="font-medium text-gray-900 flex items-center gap-1.5">
                  {loom.operatorAssigned
                    ? <><User className="w-3.5 h-3.5 text-gray-400" />{loom.operatorAssigned}</>
                    : '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Purchase Date</p>
                <p className="font-medium text-gray-900">{formatDate(loom.purchaseDate)}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Created By</p>
                <p className="font-medium text-gray-900">
                  {loom.createdBy?.name || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Created At</p>
                <p className="font-medium text-gray-900">{formatDateTime(loom.createdAt)}</p>
              </div>

            </div>
          </Card>

          {/* Specifications */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-500" />
                Technical Specifications
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-indigo-50 rounded-xl text-center">
                <p className="text-xs text-indigo-500 mb-1 font-medium">Reed Width</p>
                <p className="text-2xl font-bold text-indigo-700">{loom.reedWidth}</p>
                <p className="text-xs text-indigo-400 mt-0.5">{loom.reedWidthUnit}</p>
              </div>
              <div className="p-4 bg-violet-50 rounded-xl text-center">
                <p className="text-xs text-violet-500 mb-1 font-medium">RPM</p>
                <p className="text-2xl font-bold text-violet-700">{loom.rpm}</p>
                <p className="text-xs text-violet-400 mt-0.5">rev / min</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-xs text-emerald-500 mb-1 font-medium">Running Hours</p>
                <p className="text-2xl font-bold text-emerald-700">{loom.totalRunningHours ?? 0}</p>
                <p className="text-xs text-emerald-400 mt-0.5">total hrs</p>
              </div>
            </div>
          </Card>

          {/* Recent Production History */}
          <Card>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Recent Production
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/weaving/production', { state: { loomFilter: loom._id } })}
              >
                View All
              </Button>
            </div>

            {recentProduction.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No production records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Set #</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">Produced</th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentProduction.map((rec) => (
                      <ProductionRow key={rec._id} record={rec} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">

          {/* Current Assignment */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                Current Assignment
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Current Set */}
              <div className={`p-4 rounded-xl border ${loom.currentSetId ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Weaving Set</p>
                {loom.currentSetId ? (
                  <div>
                    <p className="font-semibold text-indigo-900 text-sm">
                      {loom.currentSetId.setNumber}
                    </p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      {loom.currentSetId.qualityName || '—'}
                    </p>
                    <button
                      onClick={() => navigate(`/weaving/sets/${loom.currentSetId._id}`)}
                      className="text-xs text-indigo-600 underline mt-1 hover:text-indigo-800"
                    >
                      View Set →
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No set assigned</p>
                )}
              </div>

              {/* Current Beam */}
              <div className={`p-4 rounded-xl border ${loom.currentBeamId ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Beam</p>
                {loom.currentBeamId ? (
                  <div>
                    <p className="font-semibold text-violet-900 text-sm">
                      {loom.currentBeamId.beamNumber}
                    </p>
                    <p className="text-xs text-violet-600 mt-0.5">
                      {loom.currentBeamId.qualityName || '—'}
                    </p>
                    <button
                      onClick={() => navigate(`/weaving/beams/${loom.currentBeamId._id}`)}
                      className="text-xs text-violet-600 underline mt-1 hover:text-violet-800"
                    >
                      View Beam →
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No beam loaded</p>
                )}
              </div>
            </div>
          </Card>

          {/* Maintenance Schedule */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-500" />
                Maintenance Schedule
              </h2>
            </div>
            <div className="p-5 space-y-3">

              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Last Maintenance
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(loom.lastMaintenanceDate)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Next Maintenance
                </div>
                <span
                  className={`text-sm font-semibold
                    ${isOverdue ? 'text-red-600' : maintenanceDays != null && maintenanceDays <= 7 ? 'text-amber-600' : 'text-gray-900'}`}
                >
                  {formatDate(loom.nextMaintenanceDate)}
                </span>
              </div>

              {maintenanceDays != null && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium
                    ${isOverdue
                      ? 'bg-red-50 text-red-700'
                      : maintenanceDays <= 7
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'}`}
                >
                  {isOverdue
                    ? <AlertTriangle className="w-3.5 h-3.5" />
                    : <CheckCircle className="w-3.5 h-3.5" />}
                  {isOverdue
                    ? `${Math.abs(maintenanceDays)}d overdue`
                    : maintenanceDays === 0
                      ? 'Due today'
                      : `${maintenanceDays}d remaining`}
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Purchase Date
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(loom.purchaseDate)}
                </span>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {loom.notes && (
            <Card>
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-500" />
                  Notes
                </h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {loom.notes}
                </p>
              </div>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" />
                Record Info
              </h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created By</span>
                <span className="font-medium text-gray-900">{loom.createdBy?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-gray-900">{formatDateTime(loom.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium text-gray-900">{formatDateTime(loom.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Active</span>
                <Badge variant={loom.isActive ? 'success' : 'danger'}>
                  {loom.isActive ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Status Change Modal ────────────────────────────────────────────── */}
      <StatusModal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        currentStatus={loom.status}
        onConfirm={handleStatusConfirm}
        loading={statusLoading}
      />

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Loom"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900">This action cannot be undone</p>
              <p className="text-sm text-red-700 mt-0.5">
                The loom will be deactivated and removed from active listings.
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Loom to be deleted</p>
            <p className="font-semibold text-gray-900">{loom.loomNumber}</p>
            <p className="text-sm text-gray-600">{loom.loomType}{loom.loomMake ? ` · ${loom.loomMake}` : ''}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleDelete}
              loading={deleteLoading}
            >
              Delete Loom
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default LoomDetail;