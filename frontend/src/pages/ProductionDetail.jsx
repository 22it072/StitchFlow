// frontend/src/pages/ProductionDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Factory,
  Clock,
  Gauge,
  Layers,
  Activity,
  Calculator,
  TrendingUp,
  FileText,
  CheckCircle,
  Download,
  Eye,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { productionAPI } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { getEfficiencyRating } from '../utils/productionCalculations';
import { useSettings } from '../context/SettingsContext';
import { useCompany } from '../context/CompanyContext';
import { generateProductionPDF } from '../services/pdfExport/templates/productionTemplate';

const ProductionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();
  const { settings } = useSettings();
  const { activeCompany } = useCompany();

  const [production, setProduction] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const fetchProduction = async () => {
      try {
        const response = await productionAPI.getOne(id);
        setProduction(response.data.data);
        setBreakdown(response.data.breakdown);
      } catch (error) {
        notifyError('Error loading production details');
        navigate('/productions');
      } finally {
        setLoading(false);
      }
    };
    fetchProduction();
  }, [id, navigate, notifyError]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productionAPI.delete(id);
      notifySuccess('Production record deleted successfully');
      navigate('/productions');
    } catch (error) {
      notifyError('Error deleting record');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateProductionPDF(
        production,
        breakdown,
        activeCompany,
        settings,
        { preview: false }
      );
      notifySuccess('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      notifyError('Error generating PDF');
    } finally {
      setExporting(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      await generateProductionPDF(
        production,
        breakdown,
        activeCompany,
        settings,
        { preview: true }
      );
    } catch (error) {
      console.error('PDF preview error:', error);
      notifyError('Error generating PDF preview');
    } finally {
      setPreviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!production) return null;

  const { loomParams, calculations, referenceData } = production;
  const efficiencyRating = getEfficiencyRating(loomParams.efficiency);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/productions')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{production.qualityName}</h1>
            <p className="text-gray-500 mt-1">
              Created {new Date(production.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Badge variant={production.status === 'active' ? 'success' : 'default'} size="lg">
            {production.status}
          </Badge>
          <Button
            variant="secondary"
            icon={Eye}
            onClick={handlePreview}
            loading={previewing}
            title="Preview PDF in new tab"
          >
            Preview
          </Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={handleExport}
            loading={exporting}
            title="Download PDF"
          >
            Export PDF
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteModal(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loom Parameters */}
          <Card>
            <div className="flex items-center space-x-2 mb-6">
              <Factory className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Loom Parameters</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Gauge className="w-6 h-6 mx-auto text-indigo-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{loomParams.rpm}</div>
                <div className="text-xs text-gray-500">RPM</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Layers className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{loomParams.pick}</div>
                <div className="text-xs text-gray-500">Pick (PPI)</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Activity className="w-6 h-6 mx-auto text-green-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{loomParams.efficiency}%</div>
                <div className={`text-xs ${efficiencyRating.color}`}>{efficiencyRating.rating}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Factory className="w-6 h-6 mx-auto text-orange-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{loomParams.machines}</div>
                <div className="text-xs text-gray-500">Machines</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{loomParams.workingHours}</div>
                <div className="text-xs text-gray-500">Hours/Day</div>
              </div>
            </div>
          </Card>

          {/* Calculation Breakdown */}
          <Card>
            <div className="flex items-center space-x-2 mb-6">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Calculation Breakdown</h2>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-800">Step 1: Raw Picks per Day</span>
                  <Badge variant="info">Formula</Badge>
                </div>
                <div className="text-sm text-blue-700 mb-2">
                  RPM × 60 × Working Hours × Machines × (Efficiency / 100)
                </div>
                <code className="text-sm text-blue-600 font-mono bg-blue-100 p-2 rounded block">
                  {loomParams.rpm} × 60 × {loomParams.workingHours} × {loomParams.machines} × ({loomParams.efficiency} / 100)
                </code>
                <div className="text-xl font-bold text-blue-900 mt-3 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-blue-500" />
                  = {calculations.rawPicksPerDay.toLocaleString('en-IN')} picks/day
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-purple-800">Step 2: Raw Production (meters)</span>
                  <Badge variant="secondary">Formula</Badge>
                </div>
                <div className="text-sm text-purple-700 mb-2">
                  Raw Picks ÷ (Pick × 39.37)
                </div>
                <code className="text-sm text-purple-600 font-mono bg-purple-100 p-2 rounded block">
                  {calculations.rawPicksPerDay.toLocaleString('en-IN')} ÷ ({loomParams.pick} × 39.37)
                </code>
                <div className="text-xl font-bold text-purple-900 mt-3 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-purple-500" />
                  = {calculations.rawProductionMeters.toFixed(4)} meters/day
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-green-800">Step 3: Formatted Production</span>
                  <Badge variant="success">Normalized</Badge>
                </div>
                <div className="text-sm text-green-700 mb-2">
                  Mathematical normalization using log₁₀ for textile-industry format
                </div>
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-4xl font-bold text-green-900">
                    {calculations.formattedProduction}
                  </span>
                  <span className="text-green-600 text-lg">
                    × {calculations.formattedScale.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {production.notes && (
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              </div>
              <p className="text-gray-600">{production.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Production Summary */}
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Production Summary</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-sm opacity-80 mb-1">Daily Production</div>
                <div className="text-3xl font-bold">
                  {calculations.rawProductionMeters.toFixed(2)} m/day
                </div>
                {/* <div className="text-sm opacity-80 mt-1">
                  = {calculations.rawProductionMeters.toFixed(2)} m/day
                </div> */}
              </div>

              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-sm opacity-80 mb-1">Monthly Production</div>
                <div className="text-2xl font-bold">
                  {calculations.monthlyProduction?.raw?.toFixed(2) || 0} m/month
                </div>
                {/* <div className="text-sm opacity-80 mt-1">
                  = {calculations.monthlyProduction?.raw?.toFixed(2) || 0} m/month
                </div> */}
                <div className="text-xs opacity-60 mt-1">
                  ({calculations.monthlyProduction?.workingDays || 26} working days)
                </div>
              </div>
            </div>
          </Card>

          {/* Reference Data */}
          {referenceData && Object.values(referenceData).some(v => v) && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reference Data</h2>
              <div className="space-y-3">
                {referenceData.panna && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Panna</span>
                    <span className="font-medium">{referenceData.panna}</span>
                  </div>
                )}
                {referenceData.reedSpace && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reed Space</span>
                    <span className="font-medium">{referenceData.reedSpace}</span>
                  </div>
                )}
                {referenceData.warpCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Warp Count</span>
                    <span className="font-medium">{referenceData.warpCount}</span>
                  </div>
                )}
                {referenceData.weftCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Weft Count</span>
                    <span className="font-medium">{referenceData.weftCount}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Record Info */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Info</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <Badge variant={production.status === 'active' ? 'success' : 'default'}>
                  {production.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-sm">
                  {new Date(production.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="font-medium text-sm">
                  {new Date(production.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Production Record"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this production record? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionDetail;