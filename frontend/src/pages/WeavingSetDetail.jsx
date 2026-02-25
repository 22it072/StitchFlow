// frontend/src/pages/WeavingSetDetail.jsx
// Change this line at the top of the file
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  PackageCheck,
  Factory,
  Package,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Target,
  TrendingUp,
  Users,
  FileText,
  Layers,
  RefreshCw,
  Play,
  Pause,
  StopCircle,
  BarChart2,
  Info,
  Hash,
  Zap,
  Flag,
  ChevronRight,
  Plus,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Select from '../components/common/Select';
import { weavingSetAPI, weavingProductionAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useCompany } from '../context/CompanyContext';
import toast from 'react-hot-toast';

// ─── Helper: status config ───────────────────────────────────────────────────
const getStatusConfig = (status) => {
  const configs = {
    Pending: {
      variant: 'warning',
      icon: Clock,
      color: 'amber',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
    },
    'In Progress': {
      variant: 'info',
      icon: Activity,
      color: 'blue',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
    },
    Completed: {
      variant: 'success',
      icon: CheckCircle,
      color: 'green',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      iconBg: 'bg-green-100',
    },
    'On Hold': {
      variant: 'warning',
      icon: AlertTriangle,
      color: 'orange',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      iconBg: 'bg-orange-100',
    },
    Cancelled: {
      variant: 'default',
      icon: XCircle,
      color: 'gray',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      iconBg: 'bg-gray-100',
    },
  };
  return configs[status] || configs.Pending;
};

// ─── Helper: priority badge ───────────────────────────────────────────────────
const getPriorityBadgeClass = (priority) => {
  const classes = {
    Urgent: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-blue-100 text-blue-700 border-blue-200',
    Low: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return classes[priority] || classes.Medium;
};

// ─── Helper: progress bar color ──────────────────────────────────────────────
const getProgressColor = (pct) => {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 75) return 'bg-blue-500';
  if (pct >= 50) return 'bg-indigo-500';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-red-400';
};

// ─── Info Row ────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, className = '' }) => (
  <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${className}`}>
    <div className="p-1.5 bg-gray-100 rounded-lg shrink-0">
      <Icon className="w-4 h-4 text-gray-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 font-medium mt-0.5 break-words">
        {value ?? <span className="text-gray-400 italic">Not set</span>}
      </p>
    </div>
  </div>
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, colorClass = 'text-gray-600', bgClass = 'bg-gray-100' }) => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-xl ${bgClass} shrink-0`}>
      <Icon className={`w-5 h-5 ${colorClass}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const WeavingSetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { activeCompany } = useCompany();

  const [set, setSet] = useState(null);
  const [productionEntries, setProductionEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSet = useCallback(async () => {
  try {
    const res = await weavingSetAPI.getOne(id, activeCompany?._id);
    const data = res.data.set || res.data;
    setSet(data);
    setNewStatus(data.status);
  } catch (err) {
    console.error(err);
    toast.error('Failed to load weaving set');
    navigate('/weaving/sets');
  }
}, [id, activeCompany?._id, navigate]);

const fetchProduction = useCallback(async () => {
  try {
    const res = await weavingProductionAPI.getAll(
      { weavingSetId: id, limit: 50 },
      activeCompany?._id
    );
    const entries = res.data.entries || res.data.productions || res.data || [];
    setProductionEntries(Array.isArray(entries) ? entries : []);
  } catch (err) {
    console.error('Production fetch error:', err);
    setProductionEntries([]);
  }
}, [id, activeCompany?._id]);

const loadAll = useCallback(async () => {
  setLoading(true);
  await Promise.all([fetchSet(), fetchProduction()]);
  setLoading(false);
}, [fetchSet, fetchProduction]);

useEffect(() => {
  if (id) loadAll();
}, [id, loadAll]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    toast.success('Refreshed');
  };

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = async () => {
    try {
      await weavingSetAPI.updateStatus(id, newStatus, activeCompany?._id);
      toast.success(`Status updated to ${newStatus}`);
      setStatusModal(false);
      fetchSet();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await weavingSetAPI.delete(id, activeCompany?._id);
      toast.success('Weaving set deleted');
      navigate('/weaving/sets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const completionPct = set
    ? Math.min(100, Math.round(((set.producedQuantity || 0) / set.orderQuantity) * 100))
    : 0;

  const remainingQty = set ? Math.max(0, set.orderQuantity - (set.producedQuantity || 0)) : 0;

  const daysRemaining =
    set?.expectedCompletionDate
      ? Math.ceil(
          (new Date(set.expectedCompletionDate) - new Date()) / (1000 * 60 * 60 * 24)
        )
      : null;

  const statusConfig = set ? getStatusConfig(set.status) : getStatusConfig('Pending');
  const StatusIcon = statusConfig.icon;

  const statusOptions = [
    { value: 'Pending', label: '⏳ Pending' },
    { value: 'In Progress', label: '🔄 In Progress' },
    { value: 'Completed', label: '✓ Completed' },
    { value: 'On Hold', label: '⏸ On Hold' },
    { value: 'Cancelled', label: '✕ Cancelled' },
  ];

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'production', label: `Production (${productionEntries.length})`, icon: BarChart2 },
    { id: 'specs', label: 'Specifications', icon: Layers },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <PackageCheck className="w-6 h-6 text-green-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!set) return null;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in pb-10">

      {/* ── Breadcrumb / Back ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate('/weaving/sets')}
          className="hover:text-gray-700 transition-colors"
        >
          Weaving Sets
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Set {set.setNumber}</span>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/weaving/sets')}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`p-3 rounded-xl ${statusConfig.iconBg}`}>
                <PackageCheck className={`w-6 h-6 ${statusConfig.text}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Set {set.setNumber}
                </h1>
                {set.qualityName && (
                  <p className="text-gray-500 mt-0.5">{set.qualityName}</p>
                )}
              </div>

              {/* Status badge */}
              <Badge variant={statusConfig.variant} icon={StatusIcon}>
                {set.status}
              </Badge>

              {/* Priority badge */}
              {set.priority && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${getPriorityBadgeClass(set.priority)}`}
                >
                  <Flag className="w-3 h-3" />
                  {set.priority}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              {set.createdAt && (
                <span>Created {new Date(set.createdAt).toLocaleDateString()}</span>
              )}
              {set.createdBy?.name && <span>by {set.createdBy.name}</span>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap shrink-0">
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={handleRefresh}
            disabled={refreshing}
            className={refreshing ? 'animate-spin' : ''}
            size="sm"
          >
            Refresh
          </Button>

          {hasPermission('production:edit') && (
            <>
              <Button
                variant="ghost"
                icon={Zap}
                size="sm"
                onClick={() => setStatusModal(true)}
              >
                Change Status
              </Button>
              <Button
                variant="ghost"
                icon={Edit2}
                size="sm"
                onClick={() => navigate('/weaving/sets', { state: { editId: id } })}
              >
                Edit
              </Button>
            </>
          )}

          {hasPermission('production:create') && (
            <Button
              icon={Plus}
              size="sm"
              onClick={() =>
                navigate('/weaving/production/new', {
                  state: { weavingSetId: id, setNumber: set.setNumber },
                })
              }
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              Add Production Entry
            </Button>
          )}

          {hasPermission('production:delete') && (
            <Button
              variant="ghost"
              icon={Trash2}
              size="sm"
              onClick={() => setDeleteConfirm(true)}
              className="text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ── Progress Banner ───────────────────────────────────────────────── */}
      <Card
        className={`border-2 ${statusConfig.border} ${statusConfig.bg}`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Circular progress */}
          <div className="relative w-24 h-24 shrink-0 mx-auto md:mx-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke={
                  completionPct >= 100 ? '#10B981' :
                  completionPct >= 50 ? '#3B82F6' : '#F59E0B'
                }
                strokeWidth="3"
                strokeDasharray={`${completionPct} ${100 - completionPct}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{completionPct}%</span>
              <span className="text-xs text-gray-500">done</span>
            </div>
          </div>

          {/* Progress details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold text-lg ${statusConfig.text}`}>
                Production Progress
              </h3>
              <span className="text-sm text-gray-600">
                {set.producedQuantity || 0} / {set.orderQuantity} {set.quantityUnit}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${getProgressColor(completionPct)}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Produced</p>
                <p className="font-semibold text-gray-800">
                  {set.producedQuantity || 0} {set.quantityUnit}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Remaining</p>
                <p className="font-semibold text-gray-800">
                  {remainingQty} {set.quantityUnit}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Target/Day</p>
                <p className="font-semibold text-gray-800">
                  {set.targetMetersPerDay
                    ? `${set.targetMetersPerDay} ${set.quantityUnit}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Days Left</p>
                <p
                  className={`font-semibold ${
                    daysRemaining == null
                      ? 'text-gray-400'
                      : daysRemaining < 0
                      ? 'text-red-600'
                      : daysRemaining <= 3
                      ? 'text-amber-600'
                      : 'text-gray-800'
                  }`}
                >
                  {daysRemaining == null
                    ? '—'
                    : daysRemaining < 0
                    ? `${Math.abs(daysRemaining)}d overdue`
                    : `${daysRemaining}d`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Order Quantity"
          value={`${set.orderQuantity} ${set.quantityUnit}`}
          bgClass="bg-indigo-100"
          colorClass="text-indigo-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Produced"
          value={`${set.producedQuantity || 0} ${set.quantityUnit}`}
          sub={`${completionPct}% complete`}
          bgClass="bg-green-100"
          colorClass="text-green-600"
        />
        <StatCard
          icon={Factory}
          label="Loom"
          value={set.allocatedLoomId?.loomNumber ? `Loom ${set.allocatedLoomId.loomNumber}` : '—'}
          sub={set.allocatedLoomId?.loomType || ''}
          bgClass="bg-blue-100"
          colorClass="text-blue-600"
        />
        <StatCard
          icon={Package}
          label="Beam"
          value={set.allocatedBeamId?.beamNumber ? `Beam ${set.allocatedBeamId.beamNumber}` : '—'}
          sub={
            set.allocatedBeamId?.remainingLength != null
              ? `${set.allocatedBeamId.remainingLength.toFixed(0)}m remaining`
              : ''
          }
          bgClass="bg-purple-100"
          colorClass="text-purple-600"
        />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-700 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Info */}
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-green-600" />
                Basic Information
              </h2>
              <div className="divide-y divide-gray-50">
                <InfoRow icon={Hash} label="Set Number" value={set.setNumber} />
                <InfoRow icon={Layers} label="Quality Name" value={set.qualityName} />
                <InfoRow
                  icon={Users}
                  label="Party"
                  value={
                    set.partyId
                      ? `${set.partyId.partyName}${set.partyId.contactPerson ? ` — ${set.partyId.contactPerson}` : ''}`
                      : null
                  }
                />
                <InfoRow
                  icon={Flag}
                  label="Priority"
                  value={
                    set.priority ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${getPriorityBadgeClass(set.priority)}`}
                      >
                        {set.priority}
                      </span>
                    ) : null
                  }
                />
                <InfoRow
                  icon={StatusIcon}
                  label="Status"
                  value={
                    <Badge variant={statusConfig.variant} icon={StatusIcon}>
                      {set.status}
                    </Badge>
                  }
                />
                {set.estimateId && (
                  <InfoRow
                    icon={FileText}
                    label="Linked Estimate"
                    value={set.estimateId.qualityName || set.estimateId._id}
                  />
                )}
                {set.notes && (
                  <InfoRow icon={FileText} label="Notes" value={set.notes} />
                )}
              </div>
            </Card>

            {/* Loom & Beam */}
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Factory className="w-4 h-4 text-green-600" />
                Loom & Beam Allocation
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Loom card */}
                <div
                  className="p-4 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    set.allocatedLoomId?._id &&
                    navigate(`/weaving/looms/${set.allocatedLoomId._id}`)
                  }
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Factory className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">
                        Allocated Loom
                      </p>
                      <p className="font-bold text-blue-900">
                        {set.allocatedLoomId?.loomNumber
                          ? `Loom ${set.allocatedLoomId.loomNumber}`
                          : 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  {set.allocatedLoomId && (
                    <div className="space-y-1 text-sm text-blue-700">
                      {set.allocatedLoomId.loomType && (
                        <p>Type: {set.allocatedLoomId.loomType}</p>
                      )}
                      {set.allocatedLoomId.status && (
                        <p>Status: {set.allocatedLoomId.status}</p>
                      )}
                      {set.allocatedLoomId.width && (
                        <p>Width: {set.allocatedLoomId.width}"</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Beam card */}
                <div
                  className="p-4 bg-purple-50 border border-purple-200 rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    set.allocatedBeamId?._id &&
                    navigate(`/weaving/beams/${set.allocatedBeamId._id}`)
                  }
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-500 font-medium uppercase tracking-wide">
                        Allocated Beam
                      </p>
                      <p className="font-bold text-purple-900">
                        {set.allocatedBeamId?.beamNumber
                          ? `Beam ${set.allocatedBeamId.beamNumber}`
                          : 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  {set.allocatedBeamId && (
                    <div className="space-y-1 text-sm text-purple-700">
                      {set.allocatedBeamId.yarnType && (
                        <p>Yarn: {set.allocatedBeamId.yarnType}</p>
                      )}
                      {set.allocatedBeamId.remainingLength != null && (
                        <p>
                          Remaining:{' '}
                          {set.allocatedBeamId.remainingLength.toFixed(0)}m
                        </p>
                      )}
                      {set.allocatedBeamId.status && (
                        <p>Status: {set.allocatedBeamId.status}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Timeline */}
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                Timeline
              </h2>
              <div className="space-y-0">
                <InfoRow
                  icon={Calendar}
                  label="Set Date"
                  value={
                    set.setDate
                      ? new Date(set.setDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : null
                  }
                />
                <InfoRow
                  icon={Play}
                  label="Start Date"
                  value={
                    set.startDate
                      ? new Date(set.startDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : null
                  }
                />
                <InfoRow
                  icon={Clock}
                  label="Expected Completion"
                  value={
                    set.expectedCompletionDate ? (
                      <span
                        className={
                          daysRemaining != null && daysRemaining < 0
                            ? 'text-red-600'
                            : ''
                        }
                      >
                        {new Date(set.expectedCompletionDate).toLocaleDateString(
                          'en-IN',
                          { day: 'numeric', month: 'long', year: 'numeric' }
                        )}
                        {daysRemaining != null && (
                          <span className="ml-1 text-xs">
                            ({daysRemaining < 0
                              ? `${Math.abs(daysRemaining)}d overdue`
                              : `${daysRemaining}d left`})
                          </span>
                        )}
                      </span>
                    ) : null
                  }
                />
                {set.actualCompletionDate && (
                  <InfoRow
                    icon={CheckCircle}
                    label="Actual Completion"
                    value={new Date(set.actualCompletionDate).toLocaleDateString(
                      'en-IN',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  />
                )}
              </div>
            </Card>

            {/* Quick actions */}
            {hasPermission('production:edit') && (
              <Card>
                <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  {set.status === 'Pending' && (
                    <Button
                      className="w-full justify-start gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                      variant="ghost"
                      icon={Play}
                      onClick={async () => {
                        await weavingSetAPI.updateStatus(id, 'In Progress', activeCompany?._id);
                        fetchSet();
                        toast.success('Set started');
                      }}
                    >
                      Start Production
                    </Button>
                  )}
                  {set.status === 'In Progress' && (
                    <>
                      <Button
                        className="w-full justify-start gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        variant="ghost"
                        icon={Pause}
                        onClick={async () => {
                          await weavingSetAPI.updateStatus(id, 'On Hold', activeCompany?._id);
                          fetchSet();
                          toast.success('Set paused');
                        }}
                      >
                        Put On Hold
                      </Button>
                      <Button
                        className="w-full justify-start gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                        variant="ghost"
                        icon={StopCircle}
                        onClick={async () => {
                          await weavingSetAPI.updateStatus(id, 'Completed', activeCompany?._id);
                          fetchSet();
                          toast.success('Set completed');
                        }}
                      >
                        Mark Completed
                      </Button>
                    </>
                  )}
                  {set.status === 'On Hold' && (
                    <Button
                      className="w-full justify-start gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                      variant="ghost"
                      icon={Play}
                      onClick={async () => {
                        await weavingSetAPI.updateStatus(id, 'In Progress', activeCompany?._id);
                        fetchSet();
                        toast.success('Set resumed');
                      }}
                    >
                      Resume Production
                    </Button>
                  )}
                  <Button
                    className="w-full justify-start gap-2"
                    variant="ghost"
                    icon={Zap}
                    onClick={() => setStatusModal(true)}
                  >
                    Change Status Manually
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PRODUCTION ENTRIES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'production' && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-green-600" />
              Production Entries
            </h2>
            {hasPermission('production:create') && (
              <Button
                icon={Plus}
                size="sm"
                onClick={() =>
                  navigate('/weaving/production/new', {
                    state: { weavingSetId: id, setNumber: set.setNumber },
                  })
                }
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                Add Entry
              </Button>
            )}
          </div>

          {productionEntries.length === 0 ? (
            <div className="text-center py-16">
              <BarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No production entries yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Start recording daily production for this set
              </p>
              {hasPermission('production:create') && (
                <Button
                  icon={Plus}
                  className="mt-4"
                  onClick={() =>
                    navigate('/weaving/production/new', {
                      state: { weavingSetId: id, setNumber: set.setNumber },
                    })
                  }
                >
                  Add First Entry
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Shift</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Produced</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Defects</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Operator</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productionEntries.map((entry, idx) => (
                    <tr
                      key={entry._id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {entry.productionDate
                          ? new Date(entry.productionDate).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {entry.shift || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-700">
                        {entry.metersProduced ?? entry.quantity ?? 0} {set.quantityUnit}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {entry.defects > 0 ? (
                          <span className="text-red-600 font-medium">{entry.defects}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {entry.operatorName || entry.operator || '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                        {entry.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={ChevronRight}
                          onClick={() => navigate(`/weaving/production/${entry._id}`)}
                          title="View Entry"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="py-3 px-4 text-gray-700" colSpan={2}>
                      Totals ({productionEntries.length} entries)
                    </td>
                    <td className="py-3 px-4 text-right text-green-700">
                      {productionEntries
                        .reduce(
                          (s, e) => s + (e.metersProduced ?? e.quantity ?? 0),
                          0
                        )
                        .toFixed(1)}{' '}
                      {set.quantityUnit}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      {productionEntries.reduce((s, e) => s + (e.defects || 0), 0)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: SPECIFICATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'specs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-600" />
              Weaving Specifications
            </h2>
            {set.weavingSpecs &&
            Object.values(set.weavingSpecs).some(
              (v) => v && (typeof v !== 'object' || Object.keys(v).length > 0)
            ) ? (
              <div>
                {set.weavingSpecs.reed && (
                  <InfoRow icon={Layers} label="Reed" value={set.weavingSpecs.reed} />
                )}
                {set.weavingSpecs.pick && (
                  <InfoRow icon={Layers} label="Pick" value={set.weavingSpecs.pick} />
                )}
                {set.weavingSpecs.panna && (
                  <InfoRow icon={Layers} label="Panna" value={set.weavingSpecs.panna} />
                )}
                {set.weavingSpecs.width && (
                  <InfoRow icon={Layers} label="Width" value={`${set.weavingSpecs.width}"`} />
                )}
                {set.weavingSpecs.targetGSM && (
                  <InfoRow
                    icon={TrendingUp}
                    label="Target GSM"
                    value={set.weavingSpecs.targetGSM}
                  />
                )}
                {set.weavingSpecs.weftYarn1?.yarnName && (
                  <InfoRow
                    icon={Package}
                    label="Weft Yarn 1"
                    value={`${set.weavingSpecs.weftYarn1.displayName || set.weavingSpecs.weftYarn1.yarnName}${
                      set.weavingSpecs.weftYarn1.denier
                        ? ` (${set.weavingSpecs.weftYarn1.denier}D)`
                        : ''
                    }`}
                  />
                )}
                {set.weavingSpecs.weftYarn2?.yarnName && (
                  <InfoRow
                    icon={Package}
                    label="Weft Yarn 2"
                    value={`${set.weavingSpecs.weftYarn2.displayName || set.weavingSpecs.weftYarn2.yarnName}${
                      set.weavingSpecs.weftYarn2.denier
                        ? ` (${set.weavingSpecs.weftYarn2.denier}D)`
                        : ''
                    }`}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No specifications available</p>
                <p className="text-xs mt-1">
                  Link an estimate to populate weaving specs
                </p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Production Targets
            </h2>
            <InfoRow
              icon={Target}
              label="Order Quantity"
              value={`${set.orderQuantity} ${set.quantityUnit}`}
            />
            <InfoRow
              icon={TrendingUp}
              label="Target per Day"
              value={
                set.targetMetersPerDay
                  ? `${set.targetMetersPerDay} ${set.quantityUnit}`
                  : null
              }
            />
            <InfoRow
              icon={Calendar}
              label="Estimated Days"
              value={
                set.targetMetersPerDay && set.orderQuantity
                  ? `${Math.ceil(set.orderQuantity / set.targetMetersPerDay)} days`
                  : null
              }
            />
            <InfoRow
              icon={CheckCircle}
              label="Produced So Far"
              value={`${set.producedQuantity || 0} ${set.quantityUnit} (${completionPct}%)`}
            />
            <InfoRow
              icon={Clock}
              label="Remaining"
              value={`${remainingQty} ${set.quantityUnit}`}
            />
          </Card>
        </div>
      )}

      {/* ══ Status Change Modal ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title="Change Set Status"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={statusOptions}
          />
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="ghost" onClick={() => setStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} icon={CheckCircle}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ Delete Confirm Modal ══════════════════════════════════════════════ */}
      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Weaving Set"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Are you sure you want to delete Set {set.setNumber}?
              </p>
              <p className="text-sm text-red-700 mt-1">
                This cannot be undone. All associated data will be removed.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WeavingSetDetail;