import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Copy,
  Trash2,
  Clock,
  RotateCcw,
  FileText,
  Tag,
  Layers,
  Info,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { estimateAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate, safeDivide } from '../utils/formatters';
import { 
  generateYarnDisplayName, 
  getYarnCategoryColor, 
  getYarnCategoryLabel 
} from '../utils/yarnFormatter';
import toast from 'react-hot-toast';

const EstimateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [versionModal, setVersionModal] = useState(false);

  useEffect(() => {
    fetchEstimate();
  }, [id]);

  const fetchEstimate = async () => {
    try {
      setLoading(true);
      const response = await estimateAPI.getOne(id);
      setEstimate(response.data);
    } catch (error) {
      console.error('Error fetching estimate:', error);
      toast.error('Failed to load estimate');
      navigate('/estimates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this estimate?')) return;

    try {
      await estimateAPI.delete(id);
      toast.success('Estimate deleted successfully');
      navigate('/estimates');
    } catch (error) {
      console.error('Error deleting estimate:', error);
      toast.error('Failed to delete estimate');
    }
  };

  const handleDuplicate = async () => {
    try {
      await estimateAPI.duplicate(id, {});
      toast.success('Estimate duplicated successfully');
      navigate('/estimates');
    } catch (error) {
      console.error('Error duplicating estimate:', error);
      toast.error('Failed to duplicate estimate');
    }
  };

  const handleRevert = async (versionNumber) => {
    if (!window.confirm(`Revert to version ${versionNumber}? This will create a new version.`)) return;

    try {
      await estimateAPI.revert(id, versionNumber);
      toast.success(`Reverted to version ${versionNumber}`);
      fetchEstimate();
      setVersionModal(false);
    } catch (error) {
      console.error('Error reverting:', error);
      toast.error('Failed to revert');
    }
  };

  // Helper to get yarn display name (handles both old and new data structure)
  const getYarnDisplayName = (section) => {
    if (!section) return '-';
    
    // New structure with yarn object
    if (section.yarn) {
      return section.yarn.displayName || generateYarnDisplayName(section.yarn) || section.yarn.yarnName || '-';
    }
    
    // Old structure with flat fields
    if (section.yarnName) {
      return generateYarnDisplayName({
        name: section.yarnName,
        denier: section.denier,
        yarnCategory: section.yarnCategory,
        tpm: section.tpm,
        filamentCount: section.filamentCount,
      }) || section.yarnName;
    }
    
    return '-';
  };

  // Helper to get yarn details (handles both old and new structure)
  const getYarnDetails = (section) => {
    if (!section) return null;
    
    // New structure
    if (section.yarn) {
      return section.yarn;
    }
    
    // Old structure - construct yarn object
    return {
      yarnName: section.yarnName,
      displayName: section.displayName,
      denier: section.denier,
      yarnCategory: section.yarnCategory || 'spun',
      tpm: section.tpm,
      filamentCount: section.filamentCount,
      yarnPrice: section.yarnPrice,
      yarnGst: section.yarnGst,
    };
  };

  // Calculate wastage for a section
  const calculateSectionWastage = (section) => {
    if (!section) return 0;
    const netWeight = section.formattedNetWeight || section.netWeight || 0;
    const grossWeight = section.formattedWeight || 0;
    return grossWeight - netWeight;
  };

  // Calculate total wastage
  const calculateTotalWastage = () => {
    if (!estimate) return 0;
    const warpWastage = calculateSectionWastage(estimate.warp);
    const weftWastage = calculateSectionWastage(estimate.weft);
    const weft2Wastage = estimate.weft2Enabled && estimate.weft2 ? calculateSectionWastage(estimate.weft2) : 0;
    return warpWastage + weftWastage + weft2Wastage;
  };

  // Calculate wastage percentage
  const calculateWastagePercentage = () => {
    const totalNet = estimate?.totalNetWeight || 0;
    const totalGross = estimate?.totalWeight || 0;
    if (totalNet === 0) return 0;
    return safeDivide((totalGross - totalNet) * 100, totalNet);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!estimate) return null;

  const warpYarn = getYarnDetails(estimate.warp);
  const weftYarn = getYarnDetails(estimate.weft);
  const weft2Yarn = estimate.weft2Enabled ? getYarnDetails(estimate.weft2) : null;
  const totalWastage = calculateTotalWastage();
  const wastagePercentage = calculateWastagePercentage();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/estimates')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{estimate.qualityName}</h1>
            <p className="text-gray-500 mt-1">
              Version {estimate.currentVersion} • Created {formatDate(estimate.createdAt, settings.dateFormat)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          {estimate.versions?.length > 0 && (
            <Button
              variant="secondary"
              icon={Clock}
              onClick={() => setVersionModal(true)}
            >
              History ({estimate.versions.length})
            </Button>
          )}
          <Button
            variant="secondary"
            icon={Copy}
            onClick={handleDuplicate}
          >
            Duplicate
          </Button>
          <Button
            variant="secondary"
            icon={Edit2}
            onClick={() => navigate(`/estimates/edit/${id}`)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Tags */}
      {estimate.tags?.length > 0 && (
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <div className="flex flex-wrap gap-2">
            {estimate.tags.map((tag, idx) => (
              <span key={idx} className="badge badge-info">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards - WITH NET WEIGHT & WASTAGE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="text-center bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200">
          {/* <div className="flex items-center justify-center mb-2">
            <Info className="w-5 h-5 text-teal-600" />
          </div> */}
          <p className="text-sm text-teal-600 mb-2">Net Weight</p>
          <p className="text-3xl font-bold text-teal-900">
            {(estimate.totalNetWeight || 0).toFixed(settings.weightDecimalPrecision)}
          </p>
          <p className="text-sm text-teal-600">Kg (without wastage)</p>
        </Card>

        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-2">Gross Weight</p>
          <p className="text-3xl font-bold text-gray-900">
            {(estimate.totalWeight || 0).toFixed(settings.weightDecimalPrecision)}
          </p>
          <p className="text-sm text-gray-500">Kg (with wastage)</p>
        </Card>

        <Card className="text-center bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
          {/* <div className="flex items-center justify-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div> */}
          <p className="text-sm text-red-600 mb-2">Total Wastage</p>
          <p className="text-3xl font-bold text-red-900">
            {totalWastage.toFixed(settings.weightDecimalPrecision)}
          </p>
          <p className="text-sm text-red-600">Kg ({wastagePercentage.toFixed(2)}%)</p>
        </Card>

        <Card className="text-center bg-indigo-600 text-white">
          <p className="text-sm text-gray-500 mb-2">Total Cost</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(estimate.totalCost, settings.currencySymbol)}
          </p>
          <p className="text-sm text-gray-500">Per meter</p>
        </Card>

        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-2">Other Cost</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(estimate.otherCostPerMeter || 0, settings.currencySymbol)}
          </p>
          <p className="text-sm text-gray-500">Per meter</p>
        </Card>
      </div>

      {/* NET WEIGHT & WASTAGE BREAKDOWN - NEW SECTION */}
      <Card className="bg-gradient-to-br from-slate-50 to-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Weight Analysis</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Warp Analysis */}
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center justify-between">
              <span>Warp</span>
              <span className="badge badge-info text-xs">Warp</span>
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Net Weight:</span>
                <span className="font-semibold text-blue-900">
                  {((estimate.warp.formattedNetWeight || estimate.warp.netWeight || 0)).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Weight:</span>
                <span className="font-semibold text-blue-900">
                  {(estimate.warp.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-100">
                <span className="text-red-600">Wastage:</span>
                <span className="font-bold text-red-700">
                  {calculateSectionWastage(estimate.warp).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Wastage %:</span>
                <span>{estimate.warp.wastage || 0}%</span>
              </div>
            </div>
          </div>

          {/* Weft Analysis */}
          <div className="bg-white rounded-xl p-4 border border-green-100">
            <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center justify-between">
              <span>Weft</span>
              <span className="badge badge-success text-xs">Weft</span>
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Net Weight:</span>
                <span className="font-semibold text-green-900">
                  {((estimate.weft.formattedNetWeight || estimate.weft.netWeight || 0)).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Weight:</span>
                <span className="font-semibold text-green-900">
                  {(estimate.weft.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-100">
                <span className="text-red-600">Wastage:</span>
                <span className="font-bold text-red-700">
                  {calculateSectionWastage(estimate.weft).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Wastage %:</span>
                <span>{estimate.weft.wastage || 0}%</span>
              </div>
            </div>
          </div>

          {/* Weft-2 Analysis (if enabled) */}
          {estimate.weft2Enabled && estimate.weft2 ? (
            <div className="bg-white rounded-xl p-4 border border-purple-100">
              <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center justify-between">
                <span>Weft-2</span>
                <span className="badge bg-purple-100 text-purple-800 text-xs">Weft-2</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Weight:</span>
                  <span className="font-semibold text-purple-900">
                    {((estimate.weft2.formattedNetWeight || estimate.weft2.netWeight || 0)).toFixed(settings.weightDecimalPrecision)} Kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Weight:</span>
                  <span className="font-semibold text-purple-900">
                    {(estimate.weft2.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-purple-100">
                  <span className="text-red-600">Wastage:</span>
                  <span className="font-bold text-red-700">
                    {calculateSectionWastage(estimate.weft2).toFixed(settings.weightDecimalPrecision)} Kg
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Wastage %:</span>
                  <span>{estimate.weft2.wastage || 0}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Weft-2 not enabled</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== WARP DETAILS ========== */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Warp Details</h3>
            <span className="badge badge-info">Warp</span>
          </div>
          
          <div className="space-y-3">
            {/* Yarn Display Name */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center space-x-2 mb-1">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Yarn</span>
              </div>
              <p className="font-semibold text-gray-900 text-lg">
                {getYarnDisplayName(estimate.warp)}
              </p>
              {warpYarn && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getYarnCategoryColor(warpYarn.yarnCategory)}`}>
                    {warpYarn.yarnCategory === 'filament' ? '🧵 Filament' : '🧶 Spun'}
                  </span>
                </div>
              )}
            </div>

            {/* Input Parameters */}
            <div className="pt-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Input Parameters</p>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Tar</span>
                  <span className="font-medium">{estimate.warp.tar}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Denier</span>
                  <span className="font-medium">{estimate.warp.denier}D</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Wastage</span>
                  <span className="font-medium">{estimate.warp.wastage}%</span>
                </div>
              </div>
            </div>

            {/* Yarn Specifications */}
            {warpYarn && (
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Yarn Specifications</p>
                <div className="space-y-2">
                  {warpYarn.tpm && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">TPM (Twists/Meter)</span>
                      <span className="font-medium">{warpYarn.tpm}</span>
                    </div>
                  )}
                  {warpYarn.filamentCount && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Filament Count</span>
                      <span className="font-medium">{warpYarn.filamentCount}F</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Yarn Price</span>
                    <span className="font-medium">
                      {formatCurrency(warpYarn.yarnPrice, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">GST</span>
                    <span className="font-medium">{warpYarn.yarnGst}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Price with GST</span>
                    <span className="font-medium text-indigo-600">
                      {formatCurrency(
                        warpYarn.yarnPrice * (1 + warpYarn.yarnGst / 100),
                        settings.currencySymbol
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Results */}
            <div className="pt-4 space-y-2 bg-blue-50 -mx-6 px-6 py-4 -mb-6 rounded-b-2xl">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Calculated Results</p>
              <div className="flex justify-between">
                <span className="text-blue-600">Net Weight</span>
                <span className="font-semibold text-blue-900">
                  {((estimate.warp.formattedNetWeight || estimate.warp.netWeight || 0)).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Gross Weight</span>
                <span className="font-bold text-blue-900">
                  {(estimate.warp.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="text-blue-600">Warp Cost</span>
                <span className="font-bold text-blue-900">
                  {formatCurrency(estimate.warp.formattedCost, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ========== WEFT DETAILS ========== */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Weft Details</h3>
            <span className="badge badge-success">Weft</span>
          </div>
          
          <div className="space-y-3">
            {/* Yarn Display Name */}
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex items-center space-x-2 mb-1">
                <Layers className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Yarn</span>
              </div>
              <p className="font-semibold text-gray-900 text-lg">
                {getYarnDisplayName(estimate.weft)}
              </p>
              {weftYarn && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getYarnCategoryColor(weftYarn.yarnCategory)}`}>
                    {weftYarn.yarnCategory === 'filament' ? '🧵 Filament' : '🧶 Spun'}
                  </span>
                </div>
              )}
            </div>

            {/* Input Parameters */}
            <div className="pt-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Input Parameters</p>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Peek</span>
                  <span className="font-medium">{estimate.weft.peek}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Panna</span>
                  <span className="font-medium">{estimate.weft.panna}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Denier</span>
                  <span className="font-medium">{estimate.weft.denier}D</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Wastage</span>
                  <span className="font-medium">{estimate.weft.wastage}%</span>
                </div>
              </div>
            </div>

            {/* Yarn Specifications */}
            {weftYarn && (
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Yarn Specifications</p>
                <div className="space-y-2">
                  {weftYarn.tpm && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">TPM (Twists/Meter)</span>
                      <span className="font-medium">{weftYarn.tpm}</span>
                    </div>
                  )}
                  {weftYarn.filamentCount && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Filament Count</span>
                      <span className="font-medium">{weftYarn.filamentCount}F</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Yarn Price</span>
                    <span className="font-medium">
                      {formatCurrency(weftYarn.yarnPrice, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">GST</span>
                    <span className="font-medium">{weftYarn.yarnGst}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Price with GST</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(
                        weftYarn.yarnPrice * (1 + weftYarn.yarnGst / 100),
                        settings.currencySymbol
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Results */}
            <div className="pt-4 space-y-2 bg-green-50 -mx-6 px-6 py-4 -mb-6 rounded-b-2xl">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Calculated Results</p>
              <div className="flex justify-between">
                <span className="text-green-600">Net Weight</span>
                <span className="font-semibold text-green-900">
                  {((estimate.weft.formattedNetWeight || estimate.weft.netWeight || 0)).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Gross Weight</span>
                <span className="font-bold text-green-900">
                  {(estimate.weft.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="text-green-600">Weft Cost</span>
                <span className="font-bold text-green-900">
                  {formatCurrency(estimate.weft.formattedCost, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ========== WEFT-2 DETAILS ========== */}
        {estimate.weft2Enabled && estimate.weft2 ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weft 2 Details</h3>
              <span className="badge bg-purple-100 text-purple-800">Weft 2</span>
            </div>
            
            <div className="space-y-3">
              {/* Yarn Display Name */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                <div className="flex items-center space-x-2 mb-1">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Yarn</span>
                </div>
                <p className="font-semibold text-gray-900 text-lg">
                  {getYarnDisplayName(estimate.weft2)}
                </p>
                {weft2Yarn && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getYarnCategoryColor(weft2Yarn.yarnCategory)}`}>
                      {weft2Yarn.yarnCategory === 'filament' ? '🧵 Filament' : '🧶 Spun'}
                    </span>
                  </div>
                )}
              </div>

              {/* Input Parameters */}
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Input Parameters</p>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Peek</span>
                    <span className="font-medium">{estimate.weft2.peek}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Panna</span>
                    <span className="font-medium">{estimate.weft2.panna}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Denier</span>
                    <span className="font-medium">{estimate.weft2.denier}D</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Wastage</span>
                    <span className="font-medium">{estimate.weft2.wastage}%</span>
                  </div>
                </div>
              </div>

              {/* Yarn Specifications */}
              {weft2Yarn && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Yarn Specifications</p>
                  <div className="space-y-2">
                    {weft2Yarn.tpm && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">TPM (Twists/Meter)</span>
                        <span className="font-medium">{weft2Yarn.tpm}</span>
                      </div>
                    )}
                    {weft2Yarn.filamentCount && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">Filament Count</span>
                        <span className="font-medium">{weft2Yarn.filamentCount}F</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Yarn Price</span>
                      <span className="font-medium">
                        {formatCurrency(weft2Yarn.yarnPrice, settings.currencySymbol)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">GST</span>
                      <span className="font-medium">{weft2Yarn.yarnGst}%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Price with GST</span>
                      <span className="font-medium text-purple-600">
                        {formatCurrency(
                          weft2Yarn.yarnPrice * (1 + weft2Yarn.yarnGst / 100),
                          settings.currencySymbol
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Calculated Results */}
              <div className="pt-4 space-y-2 bg-purple-50 -mx-6 px-6 py-4 -mb-6 rounded-b-2xl">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-2">Calculated Results</p>
                <div className="flex justify-between">
                  <span className="text-purple-600">Net Weight</span>
                  <span className="font-semibold text-purple-900">
                    {((estimate.weft2.formattedNetWeight || estimate.weft2.netWeight || 0)).toFixed(settings.weightDecimalPrecision)} Kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Gross Weight</span>
                  <span className="font-bold text-purple-900">
                    {(estimate.weft2.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-purple-200">
                  <span className="text-purple-600">Weft 2 Cost</span>
                  <span className="font-bold text-purple-900">
                    {formatCurrency(estimate.weft2.formattedCost, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center text-center">
            <div>
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Weft-2 not enabled for this estimate</p>
            </div>
          </Card>
        )}
      </div>

      {/* Yarn Comparison Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Yarn Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Section</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Yarn Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Denier</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">TPM</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Filament</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">GST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Warp Row */}
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="badge badge-info">Warp</span>
                </td>
                <td className="py-3 px-4 font-medium text-gray-900">
                  {getYarnDisplayName(estimate.warp)}
                </td>
                <td className="py-3 px-4">
                  {warpYarn && (
                    <span className={`text-xs px-2 py-1 rounded-full ${getYarnCategoryColor(warpYarn.yarnCategory)}`}>
                      {warpYarn.yarnCategory === 'filament' ? 'Filament' : 'Spun'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">{estimate.warp.denier}D</td>
                <td className="py-3 px-4">{warpYarn?.tpm || '-'}</td>
                <td className="py-3 px-4">{warpYarn?.filamentCount ? `${warpYarn.filamentCount}F` : '-'}</td>
                <td className="py-3 px-4">{formatCurrency(warpYarn?.yarnPrice, settings.currencySymbol)}</td>
                <td className="py-3 px-4">{warpYarn?.yarnGst}%</td>
              </tr>
              
              {/* Weft Row */}
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="badge badge-success">Weft</span>
                </td>
                <td className="py-3 px-4 font-medium text-gray-900">
                  {getYarnDisplayName(estimate.weft)}
                </td>
                <td className="py-3 px-4">
                  {weftYarn && (
                    <span className={`text-xs px-2 py-1 rounded-full ${getYarnCategoryColor(weftYarn.yarnCategory)}`}>
                      {weftYarn.yarnCategory === 'filament' ? 'Filament' : 'Spun'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">{estimate.weft.denier}D</td>
                <td className="py-3 px-4">{weftYarn?.tpm || '-'}</td>
                <td className="py-3 px-4">{weftYarn?.filamentCount ? `${weftYarn.filamentCount}F` : '-'}</td>
                <td className="py-3 px-4">{formatCurrency(weftYarn?.yarnPrice, settings.currencySymbol)}</td>
                <td className="py-3 px-4">{weftYarn?.yarnGst}%</td>
              </tr>
              
              {/* Weft-2 Row */}
              {estimate.weft2Enabled && estimate.weft2 && (
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="badge bg-purple-100 text-purple-800">Weft-2</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {getYarnDisplayName(estimate.weft2)}
                  </td>
                  <td className="py-3 px-4">
                    {weft2Yarn && (
                      <span className={`text-xs px-2 py-1 rounded-full ${getYarnCategoryColor(weft2Yarn.yarnCategory)}`}>
                        {weft2Yarn.yarnCategory === 'filament' ? 'Filament' : 'Spun'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">{estimate.weft2.denier}D</td>
                  <td className="py-3 px-4">{weft2Yarn?.tpm || '-'}</td>
                  <td className="py-3 px-4">{weft2Yarn?.filamentCount ? `${weft2Yarn.filamentCount}F` : '-'}</td>
                  <td className="py-3 px-4">{formatCurrency(weft2Yarn?.yarnPrice, settings.currencySymbol)}</td>
                  <td className="py-3 px-4">{weft2Yarn?.yarnGst}%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-600 mb-1">Warp Cost</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(estimate.warp.formattedCost, settings.currencySymbol)}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              {((estimate.warp.formattedCost / estimate.totalCost) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-600 mb-1">Weft Cost</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(estimate.weft.formattedCost, settings.currencySymbol)}
            </p>
            <p className="text-xs text-green-500 mt-1">
              {((estimate.weft.formattedCost / estimate.totalCost) * 100).toFixed(1)}% of total
            </p>
          </div>
          {estimate.weft2Enabled && estimate.weft2 && (
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-sm text-purple-600 mb-1">Weft-2 Cost</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(estimate.weft2.formattedCost, settings.currencySymbol)}
              </p>
              <p className="text-xs text-purple-500 mt-1">
                {((estimate.weft2.formattedCost / estimate.totalCost) * 100).toFixed(1)}% of total
              </p>
            </div>
          )}
          {estimate.otherCostPerMeter > 0 && (
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-sm text-amber-600 mb-1">Other Cost</p>
              <p className="text-2xl font-bold text-amber-900">
                {formatCurrency(estimate.otherCostPerMeter, settings.currencySymbol)}
              </p>
              <p className="text-xs text-amber-500 mt-1">
                {((estimate.otherCostPerMeter / estimate.totalCost) * 100).toFixed(1)}% of total
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Notes */}
      {estimate.notes && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{estimate.notes}</p>
        </Card>
      )}

      {/* Version History Modal */}
      <Modal
        isOpen={versionModal}
        onClose={() => setVersionModal(false)}
        title="Version History"
        size="lg"
      >
        <div className="space-y-4">
          {estimate.versions?.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {estimate.versions.slice().reverse().map((version) => (
                <div
                  key={version.versionNumber}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Version {version.versionNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(version.editedAt, settings.dateFormat)}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>Quality: {version.data?.qualityName}</span>
                      <span>•</span>
                      <span>Cost: {formatCurrency(version.data?.totalCost, settings.currencySymbol)}</span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => handleRevert(version.versionNumber)}
                  >
                    Revert
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No version history available</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default EstimateDetail;