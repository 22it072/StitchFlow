import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Package,
  Layers,
  Ruler,
  Weight,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  Info,
  ChevronRight,
  Hash,
  TrendingDown,
  Factory,
  FileText,
  BarChart3,
  Zap,
  Clock,
  CircleDot,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { beamAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useCompany } from '../context/CompanyContext';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getStatusConfig = (status) => {
  const map = {
    Ready: {
      variant: 'success',
      icon: CheckCircle,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
    },
    'On Loom': {
      variant: 'info',
      icon: Activity,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    Exhausted: {
      variant: 'default',
      icon: CircleDot,
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
    },
    Damaged: {
      variant: 'danger',
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
  };
  return (
    map[status] || {
      variant: 'default',
      icon: Activity,
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
    }
  );
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Coloured info tile */
const InfoTile = ({
  icon: Icon,
  label,
  value,
  sub,
  colorClass = 'text-purple-600',
  bgClass = 'bg-purple-50',
}) => (
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

/** Usage progress bar with percentage label */
const UsageBar = ({ totalLength, remainingLength, lengthUnit }) => {
  const used = totalLength - remainingLength;
  const usedPct = totalLength > 0 ? (used / totalLength) * 100 : 0;
  const remainPct = 100 - usedPct;

  const barColor =
    remainPct <= 10
      ? 'bg-red-500'
      : remainPct <= 25
      ? 'bg-amber-500'
      : remainPct <= 50
      ? 'bg-blue-500'
      : 'bg-green-500';

  return (
    <div className="space-y-2">
      {/* labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>Used: {used.toFixed(1)} {lengthUnit}</span>
        <span>Remaining: {remainingLength.toFixed(1)} {lengthUnit}</span>
      </div>

      {/* bar */}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${remainPct}%` }}
        />
      </div>

      {/* pct row */}
      <div className="flex justify-between text-xs font-medium">
        <span className="text-gray-500">{usedPct.toFixed(1)}% used</span>
        <span
          className={
            remainPct <= 10
              ? 'text-red-600'
              : remainPct <= 25
              ? 'text-amber-600'
              : 'text-green-600'
          }
        >
          {remainPct.toFixed(1)}% remaining
        </span>
      </div>
    </div>
  );
};

// ─── Update Remaining Modal ──────────────────────────────────────────────────

const UpdateRemainingModal = ({ isOpen, onClose, beam, onSuccess }) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { activeCompany } = useCompany();

  useEffect(() => {
    if (beam) setValue(beam.remainingLength?.toString() ?? '');
  }, [beam]);

  const handleSubmit = async () => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid non-negative number');
      return;
    }
    if (num > beam.totalLength) {
      toast.error('Remaining length cannot exceed total length');
      return;
    }

    setLoading(true);
    try {
      await beamAPI.updateRemaining(beam._id, num, activeCompany?._id);
      toast.success('Remaining length updated');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (!beam) return null;

  const newUsedPct =
    beam.totalLength > 0
      ? (((beam.totalLength - Number(value)) / beam.totalLength) * 100).toFixed(1)
      : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Remaining Length" size="sm">
      <div className="space-y-5">
        {/* current info */}
        <div className="p-4 bg-gray-50 rounded-xl space-y-1">
          <p className="text-xs text-gray-500">Beam</p>
          <p className="font-semibold text-gray-900">{beam.beamNumber}</p>
          <p className="text-sm text-gray-600">
            Total: {beam.totalLength} {beam.lengthUnit}
          </p>
          <p className="text-sm text-gray-600">
            Current remaining: {beam.remainingLength} {beam.lengthUnit}
          </p>
        </div>

        <Input
          label={`New Remaining Length (${beam.lengthUnit})`}
          type="number"
          step="0.01"
          min="0"
          max={beam.totalLength}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          icon={Ruler}
          placeholder="Enter new remaining length"
        />

        {/* live preview */}
        {value !== '' && !isNaN(Number(value)) && (
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs text-indigo-600 font-medium mb-2">Preview</p>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, ((Number(value)) / beam.totalLength) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-indigo-500 mt-1.5">
              {newUsedPct}% will be consumed
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} icon={TrendingDown}>
            Update
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const BeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { activeCompany } = useCompany();

  const [beam, setBeam]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [updateModal, setUpdateModal]     = useState(false);
  const [deleteModal, setDeleteModal]     = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchBeam = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await beamAPI.getOne(id, activeCompany?._id);
      setBeam(res.data.beam || res.data);
    } catch (err) {
      console.error('Fetch beam error:', err);
      if (err.response?.status === 404) {
        toast.error('Beam not found');
        navigate('/weaving/beams');
      } else {
        toast.error('Failed to load beam details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeam();
  }, [id, activeCompany?._id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBeam(true);
    setRefreshing(false);
    toast.success('Refreshed');
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await beamAPI.delete(id, activeCompany?._id);
      toast.success('Beam deleted successfully');
      navigate('/weaving/beams');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete beam');
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-gray-200 rounded-2xl" />
          <div className="h-72 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!beam) return null;

  // ── Derived ────────────────────────────────────────────────────────────────

  const statusCfg   = getStatusConfig(beam.status);
  const StatusIcon  = statusCfg.icon;
  const usedLength  = beam.totalLength - beam.remainingLength;
  const remainPct   =
    beam.totalLength > 0
      ? ((beam.remainingLength / beam.totalLength) * 100).toFixed(1)
      : 0;
  const isLow       = Number(remainPct) <= 25 && beam.status !== 'Exhausted';
  const isExhausted = beam.status === 'Exhausted' || beam.remainingLength === 0;

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate('/weaving/beams')}
          className="hover:text-purple-600 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Beam Management
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{beam.beamNumber}</span>
      </div>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Icon badge */}
          <div className="p-3 bg-purple-100 rounded-2xl">
            <Package className="w-7 h-7 text-purple-600" />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{beam.beamNumber}</h1>

              {/* Status pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                  text-xs font-semibold border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                {beam.status}
              </span>

              {/* Low stock warning */}
              {isLow && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                  text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">
                  <AlertTriangle className="w-3 h-3" />
                  Low Stock
                </span>
              )}
            </div>

            <p className="text-gray-500 mt-1 text-sm">
              {beam.beamType}
              {beam.qualityName && ` · ${beam.qualityName}`}
            </p>
          </div>
        </div>

        {/* Actions */}
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

          {hasPermission('production:edit') && !isExhausted && (
            <Button
              variant="outline"
              size="sm"
              icon={TrendingDown}
              onClick={() => setUpdateModal(true)}
            >
              Update Remaining
            </Button>
          )}

          {hasPermission('production:edit') && (
            <Button
              variant="outline"
              size="sm"
              icon={Edit2}
              onClick={() =>
                navigate('/weaving/beams', { state: { editBeamId: beam._id } })
              }
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

      {/* ── Alert Banners ──────────────────────────────────────────────────── */}
      {isExhausted && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <CircleDot className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Beam Exhausted</p>
            <p className="text-xs text-gray-500 mt-0.5">
              This beam has been fully consumed and is no longer available for use.
            </p>
          </div>
        </div>
      )}

      {!isExhausted && isLow && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Low remaining length — {remainPct}% left
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Only {beam.remainingLength} {beam.lengthUnit} remaining out of{' '}
              {beam.totalLength} {beam.lengthUnit}.
            </p>
          </div>
        </div>
      )}

      {/* ── Quick Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoTile
          icon={Ruler}
          label="Total Length"
          value={`${beam.totalLength} ${beam.lengthUnit}`}
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
        />
        <InfoTile
          icon={TrendingDown}
          label="Remaining"
          value={`${beam.remainingLength} ${beam.lengthUnit}`}
          sub={`${remainPct}% left`}
          colorClass={
            Number(remainPct) <= 10
              ? 'text-red-600'
              : Number(remainPct) <= 25
              ? 'text-amber-600'
              : 'text-green-600'
          }
          bgClass={
            Number(remainPct) <= 10
              ? 'bg-red-50'
              : Number(remainPct) <= 25
              ? 'bg-amber-50'
              : 'bg-green-50'
          }
        />
        <InfoTile
          icon={Layers}
          label="TAR (Ends)"
          value={beam.tar}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <InfoTile
          icon={Zap}
          label="Denier"
          value={beam.denier}
          colorClass="text-violet-600"
          bgClass="bg-violet-50"
        />
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (2/3) ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Usage Progress */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                Length Usage
              </h2>
            </div>
            <div className="p-5 space-y-6">
              <UsageBar
                totalLength={beam.totalLength}
                remainingLength={beam.remainingLength}
                lengthUnit={beam.lengthUnit}
              />

              {/* three metric tiles */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-purple-50 rounded-xl text-center">
                  <p className="text-xs text-purple-500 font-medium mb-1">Total</p>
                  <p className="text-xl font-bold text-purple-700">{beam.totalLength}</p>
                  <p className="text-xs text-purple-400">{beam.lengthUnit}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 font-medium mb-1">Used</p>
                  <p className="text-xl font-bold text-gray-700">{usedLength.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">{beam.lengthUnit}</p>
                </div>
                <div
                  className={`p-4 rounded-xl text-center ${
                    Number(remainPct) <= 10
                      ? 'bg-red-50'
                      : Number(remainPct) <= 25
                      ? 'bg-amber-50'
                      : 'bg-green-50'
                  }`}
                >
                  <p
                    className={`text-xs font-medium mb-1 ${
                      Number(remainPct) <= 10
                        ? 'text-red-500'
                        : Number(remainPct) <= 25
                        ? 'text-amber-500'
                        : 'text-green-500'
                    }`}
                  >
                    Remaining
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      Number(remainPct) <= 10
                        ? 'text-red-700'
                        : Number(remainPct) <= 25
                        ? 'text-amber-700'
                        : 'text-green-700'
                    }`}
                  >
                    {beam.remainingLength.toFixed(1)}
                  </p>
                  <p
                    className={`text-xs ${
                      Number(remainPct) <= 10
                        ? 'text-red-400'
                        : Number(remainPct) <= 25
                        ? 'text-amber-400'
                        : 'text-green-400'
                    }`}
                  >
                    {beam.lengthUnit}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Basic Information */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-500" />
                Basic Information
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">

              <div>
                <p className="text-xs text-gray-400 mb-1">Beam Number</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-gray-400" />
                  {beam.beamNumber}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Beam Type</p>
                <p className="font-medium text-gray-900">{beam.beamType}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Quality Name</p>
                <p className="font-medium text-gray-900">{beam.qualityName || '—'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Length Unit</p>
                <p className="font-medium text-gray-900 capitalize">{beam.lengthUnit}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Preparation Date</p>
                <p className="font-medium text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatDate(beam.preparationDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Created By</p>
                <p className="font-medium text-gray-900">
                  {beam.createdBy?.name || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Created At</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(beam.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(beam.updatedAt)}
                </p>
              </div>

            </div>
          </Card>

          {/* Technical Specifications */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                Technical Specifications
              </h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-indigo-50 rounded-xl text-center">
                  <p className="text-xs text-indigo-500 font-medium mb-1">TAR / Ends</p>
                  <p className="text-2xl font-bold text-indigo-700">{beam.tar}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">ends</p>
                </div>
                <div className="p-4 bg-violet-50 rounded-xl text-center">
                  <p className="text-xs text-violet-500 font-medium mb-1">Denier</p>
                  <p className="text-2xl font-bold text-violet-700">{beam.denier}</p>
                  <p className="text-xs text-violet-400 mt-0.5">D</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl text-center">
                  <p className="text-xs text-purple-500 font-medium mb-1">Beam Weight (Raw)</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {beam.beamWeight?.raw != null
                      ? beam.beamWeight.raw.toFixed(2)
                      : '—'}
                  </p>
                  <p className="text-xs text-purple-400 mt-0.5">kg</p>
                </div>
                <div className="p-4 bg-fuchsia-50 rounded-xl text-center">
                  <p className="text-xs text-fuchsia-500 font-medium mb-1">Beam Weight (Net)</p>
                  <p className="text-2xl font-bold text-fuchsia-700">
                    {beam.beamWeight?.formatted != null
                      ? beam.beamWeight.formatted.toFixed(2)
                      : '—'}
                  </p>
                  <p className="text-xs text-fuchsia-400 mt-0.5">kg</p>
                </div>
              </div>

              {/* Yarn details if linked to estimate */}
              {beam.yarnDetails?.warpYarn?.yarnName && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                    Warp Yarn Details
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Yarn Name</p>
                      <p className="font-medium text-gray-900">
                        {beam.yarnDetails.warpYarn.displayName ||
                          beam.yarnDetails.warpYarn.yarnName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Denier</p>
                      <p className="font-medium text-gray-900">
                        {beam.yarnDetails.warpYarn.denier ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* ── Right column (1/3) ───────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Current Status */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Current Status
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Big status badge */}
              <div
                className={`flex items-center gap-3 p-4 rounded-xl border
                  ${statusCfg.bg} ${statusCfg.border}`}
              >
                <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                  <StatusIcon className={`w-5 h-5 ${statusCfg.text}`} />
                </div>
                <div>
                  <p className={`font-semibold ${statusCfg.text}`}>{beam.status}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {beam.status === 'Ready' && 'Available for use'}
                    {beam.status === 'On Loom' && 'Currently mounted on loom'}
                    {beam.status === 'Exhausted' && 'Fully consumed'}
                    {beam.status === 'Damaged' && 'Not usable — requires inspection'}
                  </p>
                </div>
              </div>

              {/* Remaining visual indicator */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Remaining capacity</span>
                  <span className="font-medium">{remainPct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      Number(remainPct) <= 10
                        ? 'bg-red-500'
                        : Number(remainPct) <= 25
                        ? 'bg-amber-500'
                        : Number(remainPct) <= 50
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${remainPct}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Current Loom Assignment */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Factory className="w-4 h-4 text-purple-500" />
                Loom Assignment
              </h2>
            </div>
            <div className="p-5">
              {beam.currentLoomId ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs text-blue-500 mb-1">Mounted on Loom</p>
                  <p className="font-semibold text-blue-900 text-sm">
                    {beam.currentLoomId.loomNumber}
                  </p>
                  {beam.currentLoomId.loomType && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      {beam.currentLoomId.loomType}
                    </p>
                  )}
                  <button
                    onClick={() =>
                      navigate(`/weaving/looms/${beam.currentLoomId._id}`)
                    }
                    className="text-xs text-blue-600 underline mt-2 hover:text-blue-800 block"
                  >
                    View Loom →
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400 italic">Not assigned to any loom</p>
                </div>
              )}
            </div>
          </Card>

          {/* Linked Estimate */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                Linked Estimate
              </h2>
            </div>
            <div className="p-5">
              {beam.estimateId ? (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-xs text-purple-500 mb-1">Estimate</p>
                  <p className="font-semibold text-purple-900 text-sm">
                    {beam.estimateId.estimateNumber ||
                      beam.estimateId.qualityName ||
                      'View Estimate'}
                  </p>
                  {beam.estimateId.qualityName && (
                    <p className="text-xs text-purple-600 mt-0.5">
                      {beam.estimateId.qualityName}
                    </p>
                  )}
                  <button
                    onClick={() =>
                      navigate(`/estimates/${beam.estimateId._id}`)
                    }
                    className="text-xs text-purple-600 underline mt-2 hover:text-purple-800 block"
                  >
                    View Estimate →
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400 italic">No estimate linked</p>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {beam.notes && (
            <Card>
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-500" />
                  Notes
                </h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {beam.notes}
                </p>
              </div>
            </Card>
          )}

          {/* Record Info */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Record Info
              </h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created By</span>
                <span className="font-medium text-gray-900">
                  {beam.createdBy?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-gray-900">
                  {formatDateTime(beam.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium text-gray-900">
                  {formatDateTime(beam.updatedAt)}
                </span>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Update Remaining Modal ─────────────────────────────────────────── */}
      <UpdateRemainingModal
        isOpen={updateModal}
        onClose={() => setUpdateModal(false)}
        beam={beam}
        onSuccess={() => fetchBeam(true)}
      />

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Beam"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                This action cannot be undone
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                The beam record will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Beam to be deleted</p>
            <p className="font-semibold text-gray-900">{beam.beamNumber}</p>
            <p className="text-sm text-gray-600">
              {beam.beamType} · {beam.qualityName}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleDelete}
              loading={deleteLoading}
            >
              Delete Beam
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default BeamDetail;