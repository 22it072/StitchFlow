import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  Calculator,
  RefreshCw,
  Clock,
  Info,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { yarnAPI, estimateAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useNotifications } from '../context/NotificationContext';
import { calculateEstimate } from '../utils/calculations';
import { formatCurrency, safeDivide } from '../utils/formatters';
import toast from 'react-hot-toast';

const NewEstimate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { settings } = useSettings();
  const { notifyAutoSave, notifyEstimateSaved } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [yarns, setYarns] = useState([]);
  const [weft2Enabled, setWeft2Enabled] = useState(settings.enableWeft2ByDefault);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [showNetBreakdown, setShowNetBreakdown] = useState(false);

  // Initialize form with default wastage from settings
  const getInitialFormData = () => ({
    qualityName: '',
    warp: {
      tar: '',
      denier: '',
      wastage: settings.defaultWastage,
      yarnId: '',
      yarnName: '',
      yarnPrice: 0,
      yarnGst: 0,
    },
    weft: {
      peek: '',
      panna: '',
      denier: '',
      wastage: settings.defaultWastage,
      yarnId: '',
      yarnName: '',
      yarnPrice: 0,
      yarnGst: 0,
    },
    weft2: {
      peek: '',
      panna: '',
      denier: '',
      wastage: settings.defaultWastage,
      yarnId: '',
      yarnName: '',
      yarnPrice: 0,
      yarnGst: 0,
    },
    otherCostPerMeter: '',
    notes: '',
    tags: '',
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // Update form when settings change (only for new estimates)
  useEffect(() => {
    if (!isEditing && !formData.qualityName) {
      setFormData(getInitialFormData());
    }
  }, [settings.defaultWastage, isEditing]);

  // Fetch yarns
  useEffect(() => {
    const fetchYarns = async () => {
      try {
        const response = await yarnAPI.getAll({ active: true });
        setYarns(response.data);
      } catch (error) {
        console.error('Error fetching yarns:', error);
      }
    };
    fetchYarns();
  }, []);

  // Fetch existing estimate if editing
  useEffect(() => {
    const fetchEstimate = async () => {
      if (!isEditing) return;
      
      try {
        setLoading(true);
        const response = await estimateAPI.getOne(id);
        const estimate = response.data;

        setFormData({
          qualityName: estimate.qualityName,
          warp: {
            tar: estimate.warp.tar,
            denier: estimate.warp.denier,
            wastage: estimate.warp.wastage,
            yarnId: estimate.warp.yarnId?._id || '',
            yarnName: estimate.warp.yarnName,
            yarnPrice: estimate.warp.yarnPrice,
            yarnGst: estimate.warp.yarnGst,
          },
          weft: {
            peek: estimate.weft.peek,
            panna: estimate.weft.panna,
            denier: estimate.weft.denier,
            wastage: estimate.weft.wastage,
            yarnId: estimate.weft.yarnId?._id || '',
            yarnName: estimate.weft.yarnName,
            yarnPrice: estimate.weft.yarnPrice,
            yarnGst: estimate.weft.yarnGst,
          },
          weft2: estimate.weft2 ? {
            peek: estimate.weft2.peek,
            panna: estimate.weft2.panna,
            denier: estimate.weft2.denier,
            wastage: estimate.weft2.wastage,
            yarnId: estimate.weft2.yarnId?._id || '',
            yarnName: estimate.weft2.yarnName,
            yarnPrice: estimate.weft2.yarnPrice,
            yarnGst: estimate.weft2.yarnGst,
          } : {
            peek: '',
            panna: '',
            denier: '',
            wastage: settings.defaultWastage || 3,
            yarnId: '',
            yarnName: '',
            yarnPrice: 0,
            yarnGst: 0,
          },
          otherCostPerMeter: estimate.otherCostPerMeter || '',
          notes: estimate.notes || '',
          tags: estimate.tags?.join(', ') || '',
        });
        setWeft2Enabled(estimate.weft2Enabled);
      } catch (error) {
        console.error('Error fetching estimate:', error);
        toast.error('Failed to load estimate');
        navigate('/estimates');
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [id, isEditing, navigate, settings.defaultWastage]);

  // Check for draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      if (isEditing) return;
      
      try {
        const response = await estimateAPI.getDraft();
        if (response.data?.formData) {
          if (window.confirm('You have an unsaved draft. Would you like to restore it?')) {
            setFormData(response.data.formData);
            setWeft2Enabled(response.data.formData.weft2Enabled || false);
            toast.success('Draft restored');
          }
        }
      } catch (error) {
        // No draft found, continue
      }
    };
    checkDraft();
  }, [isEditing]);

  // Auto-save draft with notification
  const autoSaveDraft = useCallback(async () => {
    if (isEditing) return;
    if (!formData.qualityName && !formData.warp.tar && !formData.weft.peek) return;
    
    try {
      setAutoSaveStatus('saving');
      await estimateAPI.saveDraft({ formData: { ...formData, weft2Enabled } });
      setLastAutoSave(new Date());
      setAutoSaveStatus('saved');
      
      notifyAutoSave(formData.qualityName || 'Untitled Estimate');
      
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('idle');
    }
  }, [formData, weft2Enabled, isEditing, notifyAutoSave]);

  useEffect(() => {
    const interval = setInterval(autoSaveDraft, settings.autoSaveInterval * 1000);
    return () => clearInterval(interval);
  }, [autoSaveDraft, settings.autoSaveInterval]);

  const handleChange = (section, field, value) => {
    if (section === 'root') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value },
      }));
    }
    setShowResults(false);
  };

  const handleYarnSelect = (section, yarnId) => {
    const yarn = yarns.find(y => y._id === yarnId);
    if (yarn) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          yarnId: yarn._id,
          yarnName: yarn.name,
          yarnPrice: yarn.price,
          yarnGst: yarn.gstPercentage,
          denier: yarn.denier,
        },
      }));
    }
    setShowResults(false);
  };

  const handleCalculate = () => {
    if (!formData.qualityName) {
      toast.error('Please enter a quality name');
      return;
    }

    const warpValid = formData.warp.tar && formData.warp.denier && 
                     formData.warp.wastage !== '' && formData.warp.yarnPrice;
    const weftValid = formData.weft.peek && formData.weft.panna && 
                     formData.weft.denier && formData.weft.wastage !== '' && 
                     formData.weft.yarnPrice;

    if (!warpValid || !weftValid) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (weft2Enabled) {
      const weft2Valid = formData.weft2.peek && formData.weft2.panna && 
                        formData.weft2.denier && formData.weft2.wastage !== '' && 
                        formData.weft2.yarnPrice;
      if (!weft2Valid) {
        toast.error('Please fill in all Weft-2 fields');
        return;
      }
    }

    const calcInput = {
      warp: {
        tar: parseFloat(formData.warp.tar),
        denier: parseFloat(formData.warp.denier),
        wastage: parseFloat(formData.warp.wastage),
        yarnPrice: parseFloat(formData.warp.yarnPrice),
        yarnGst: parseFloat(formData.warp.yarnGst),
      },
      weft: {
        peek: parseFloat(formData.weft.peek),
        panna: parseFloat(formData.weft.panna),
        denier: parseFloat(formData.weft.denier),
        wastage: parseFloat(formData.weft.wastage),
        yarnPrice: parseFloat(formData.weft.yarnPrice),
        yarnGst: parseFloat(formData.weft.yarnGst),
      },
      weft2Enabled,
      weft2: weft2Enabled ? {
        peek: parseFloat(formData.weft2.peek),
        panna: parseFloat(formData.weft2.panna),
        denier: parseFloat(formData.weft2.denier),
        wastage: parseFloat(formData.weft2.wastage),
        yarnPrice: parseFloat(formData.weft2.yarnPrice),
        yarnGst: parseFloat(formData.weft2.yarnGst),
      } : null,
      otherCostPerMeter: parseFloat(formData.otherCostPerMeter) || 0,
    };

    const calcResults = calculateEstimate(
      calcInput,
      settings.weightDecimalPrecision,
      settings.costDecimalPrecision
    );
    
    setResults(calcResults);
    setShowResults(true);
    toast.success('Calculation completed');
  };

  const handleSave = async () => {
    if (!results) {
      toast.error('Please calculate first');
      return;
    }

    setSaving(true);

    try {
      const estimateData = {
        qualityName: formData.qualityName,
        warp: {
          tar: parseFloat(formData.warp.tar),
          denier: parseFloat(formData.warp.denier),
          wastage: parseFloat(formData.warp.wastage),
          yarnId: formData.warp.yarnId || null,
          yarnName: formData.warp.yarnName,
          yarnPrice: parseFloat(formData.warp.yarnPrice),
          yarnGst: parseFloat(formData.warp.yarnGst),
        },
        weft: {
          peek: parseFloat(formData.weft.peek),
          panna: parseFloat(formData.weft.panna),
          denier: parseFloat(formData.weft.denier),
          wastage: parseFloat(formData.weft.wastage),
          yarnId: formData.weft.yarnId || null,
          yarnName: formData.weft.yarnName,
          yarnPrice: parseFloat(formData.weft.yarnPrice),
          yarnGst: parseFloat(formData.weft.yarnGst),
        },
        weft2Enabled,
        weft2: weft2Enabled ? {
          peek: parseFloat(formData.weft2.peek),
          panna: parseFloat(formData.weft2.panna),
          denier: parseFloat(formData.weft2.denier),
          wastage: parseFloat(formData.weft2.wastage),
          yarnId: formData.weft2.yarnId || null,
          yarnName: formData.weft2.yarnName,
          yarnPrice: parseFloat(formData.weft2.yarnPrice),
          yarnGst: parseFloat(formData.weft2.yarnGst),
        } : null,
        otherCostPerMeter: parseFloat(formData.otherCostPerMeter) || 0,
        notes: formData.notes,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (isEditing) {
        await estimateAPI.update(id, estimateData);
        notifyEstimateSaved(formData.qualityName, true);
      } else {
        await estimateAPI.create(estimateData);
        await estimateAPI.deleteDraft();
        notifyEstimateSaved(formData.qualityName, false);
      }

      navigate('/estimates');
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast.error('Failed to save estimate');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Are you sure you want to reset the form? All entered data will be lost.')) return;
    setFormData(getInitialFormData());
    setResults(null);
    setShowResults(false);
    toast.success('Form reset to defaults');
  };

  const getYarnOptions = (type) => {
    return yarns
      .filter(y => y.yarnType === 'all' || y.yarnType === type)
      .map(y => ({
        value: y._id,
        label: `${y.name} (${y.denier}D - ${formatCurrency(y.price, settings.currencySymbol)})`,
      }));
  };

  // Helper function to calculate wastage percentage safely
  const calculateWastagePercentage = (grossWeight, netWeight) => {
    if (!netWeight || netWeight === 0) return 0;
    const wastage = grossWeight - netWeight;
    return safeDivide(wastage * 100, netWeight);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Estimate' : 'New Estimate'}
          </h1>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-gray-500">Calculate grey cloth weight and cost</p>
            {!isEditing && (
              <div className="flex items-center space-x-2">
                {autoSaveStatus === 'saving' && (
                  <span className="flex items-center text-xs text-blue-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1.5" />
                    Saving draft...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="flex items-center text-xs text-green-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Draft saved
                  </span>
                )}
                {lastAutoSave && autoSaveStatus === 'idle' && (
                  <span className="text-xs text-gray-400">
                    Last saved: {lastAutoSave.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Button variant="secondary" onClick={() => navigate('/estimates')}>
            Cancel
          </Button>
          {!isEditing && (
            <Button variant="ghost" icon={RefreshCw} onClick={handleReset}>
              Reset
            </Button>
          )}
          <Button
            icon={Calculator}
            onClick={handleCalculate}
          >
            Calculate
          </Button>
          <Button
            icon={Save}
            onClick={handleSave}
            loading={saving}
            disabled={!results}
          >
            {isEditing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quality Name */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Details</h3>
            <Input
              label="Quality Name / Cloth Name"
              value={formData.qualityName}
              onChange={(e) => handleChange('root', 'qualityName', e.target.value)}
              placeholder="e.g., Cotton Silk 120GSM"
              required
            />
          </Card>

          {/* Warp Section */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Warp Details</h3>
              <span className="badge badge-info">Required</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Select Yarn"
                value={formData.warp.yarnId}
                onChange={(e) => handleYarnSelect('warp', e.target.value)}
                options={getYarnOptions('warp')}
                placeholder="Choose a yarn"
              />
              <Input
                label="Tar"
                type="number"
                step="0.01"
                value={formData.warp.tar}
                onChange={(e) => handleChange('warp', 'tar', e.target.value)}
                placeholder="Enter tar value"
                required
              />
              <Input
                label="Denier"
                type="number"
                step="0.01"
                value={formData.warp.denier}
                onChange={(e) => handleChange('warp', 'denier', e.target.value)}
                placeholder="Denier"
                required
              />
              <Input
                label="Wastage (%)"
                type="number"
                step="0.01"
                value={formData.warp.wastage}
                onChange={(e) => handleChange('warp', 'wastage', e.target.value)}
                placeholder="e.g., 3"
                required
              />
              <Input
                label="Yarn Price"
                type="number"
                step="0.01"
                value={formData.warp.yarnPrice}
                onChange={(e) => handleChange('warp', 'yarnPrice', e.target.value)}
                placeholder="Price"
                required
              />
              <Input
                label="GST (%)"
                type="number"
                step="0.01"
                value={formData.warp.yarnGst}
                onChange={(e) => handleChange('warp', 'yarnGst', e.target.value)}
                placeholder="GST %"
                required
              />
            </div>
          </Card>

          {/* Weft Section */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weft Details</h3>
              <span className="badge badge-info">Required</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Select Yarn"
                value={formData.weft.yarnId}
                onChange={(e) => handleYarnSelect('weft', e.target.value)}
                options={getYarnOptions('weft')}
                placeholder="Choose a yarn"
              />
              <Input
                label="Peek"
                type="number"
                step="0.01"
                value={formData.weft.peek}
                onChange={(e) => handleChange('weft', 'peek', e.target.value)}
                placeholder="Enter peek value"
                required
              />
              <Input
                label="Panna"
                type="number"
                step="0.01"
                value={formData.weft.panna}
                onChange={(e) => handleChange('weft', 'panna', e.target.value)}
                placeholder="Enter panna value"
                required
              />
              <Input
                label="Denier"
                type="number"
                step="0.01"
                value={formData.weft.denier}
                onChange={(e) => handleChange('weft', 'denier', e.target.value)}
                placeholder="Denier"
                required
              />
              <Input
                label="Wastage (%)"
                type="number"
                step="0.01"
                value={formData.weft.wastage}
                onChange={(e) => handleChange('weft', 'wastage', e.target.value)}
                placeholder="e.g., 3"
                required
              />
              <Input
                label="Yarn Price"
                type="number"
                step="0.01"
                value={formData.weft.yarnPrice}
                onChange={(e) => handleChange('weft', 'yarnPrice', e.target.value)}
                placeholder="Price"
                required
              />
              <Input
                label="GST (%)"
                type="number"
                step="0.01"
                value={formData.weft.yarnGst}
                onChange={(e) => handleChange('weft', 'yarnGst', e.target.value)}
                placeholder="GST %"
                required
              />
            </div>
          </Card>

          {/* Weft-2 Section (Optional) */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">Weft-2 Details</h3>
                <span className="badge badge-warning">Optional</span>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weft2Enabled}
                  onChange={(e) => setWeft2Enabled(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">Enable Weft-2</span>
              </label>
            </div>

            {weft2Enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Select Yarn"
                  value={formData.weft2.yarnId}
                  onChange={(e) => handleYarnSelect('weft2', e.target.value)}
                  options={getYarnOptions('weft-2')}
                  placeholder="Choose a yarn"
                />
                <Input
                  label="Peek-2"
                  type="number"
                  step="0.01"
                  value={formData.weft2.peek}
                  onChange={(e) => handleChange('weft2', 'peek', e.target.value)}
                  placeholder="Enter peek value"
                />
                <Input
                  label="Panna-2"
                  type="number"
                  step="0.01"
                  value={formData.weft2.panna}
                  onChange={(e) => handleChange('weft2', 'panna', e.target.value)}
                  placeholder="Enter panna value"
                />
                <Input
                  label="Denier"
                  type="number"
                  step="0.01"
                  value={formData.weft2.denier}
                  onChange={(e) => handleChange('weft2', 'denier', e.target.value)}
                  placeholder="Denier"
                />
                <Input
                  label="Wastage (%)"
                  type="number"
                  step="0.01"
                  value={formData.weft2.wastage}
                  onChange={(e) => handleChange('weft2', 'wastage', e.target.value)}
                  placeholder="e.g., 3"
                />
                <Input
                  label="Yarn Price"
                  type="number"
                  step="0.01"
                  value={formData.weft2.yarnPrice}
                  onChange={(e) => handleChange('weft2', 'yarnPrice', e.target.value)}
                  placeholder="Price"
                />
                <Input
                  label="GST (%)"
                  type="number"
                  step="0.01"
                  value={formData.weft2.yarnGst}
                  onChange={(e) => handleChange('weft2', 'yarnGst', e.target.value)}
                  placeholder="GST %"
                />
              </div>
            )}
          </Card>

          {/* Other Cost */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Costs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Other Cost per Meter"
                type="number"
                step="0.01"
                value={formData.otherCostPerMeter}
                onChange={(e) => handleChange('root', 'otherCostPerMeter', e.target.value)}
                placeholder="e.g., 0.50"
              />
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes & Tags</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('root', 'notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 input-focus"
                  placeholder="Add any notes about this estimate..."
                />
              </div>
              <Input
                label="Tags (comma separated)"
                value={formData.tags}
                onChange={(e) => handleChange('root', 'tags', e.target.value)}
                placeholder="e.g., cotton, premium, summer"
              />
            </div>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Calculation Results</h3>
              {showResults && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RefreshCw}
                  onClick={handleCalculate}
                >
                  Recalculate
                </Button>
              )}
            </div>

            {showResults && results ? (
              <div className="space-y-6">
                {/* Warp Results */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-3">Warp</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between pb-2 border-b border-blue-200">
                      <span className="text-blue-700">Net Weight:</span>
                      <span className="font-semibold text-blue-900">
                        {(results.warp.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-blue-700">Gross Weight:</span>
                      <span className="font-bold text-blue-900">
                        {(results.warp.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="text-blue-700">Warp Cost:</span>
                      <span className="font-bold text-blue-900">
                        {formatCurrency(results.warp.formattedCost || 0, settings.currencySymbol)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-xs text-blue-600 pt-2">
                      <span>Wastage:</span>
                      <span>
                        {(results.wastage?.warp || 0).toFixed(settings.weightDecimalPrecision)} Kg 
                        ({formData.warp.wastage}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weft Results */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <h4 className="font-medium text-green-900 mb-3">Weft</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between pb-2 border-b border-green-200">
                      <span className="text-green-700">Net Weight:</span>
                      <span className="font-semibold text-green-900">
                        {(results.weft.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-green-700">Gross Weight:</span>
                      <span className="font-bold text-green-900">
                        {(results.weft.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t border-green-200">
                      <span className="text-green-700">Weft Cost:</span>
                      <span className="font-bold text-green-900">
                        {formatCurrency(results.weft.formattedCost || 0, settings.currencySymbol)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-xs text-green-600 pt-2">
                      <span>Wastage:</span>
                      <span>
                        {(results.wastage?.weft || 0).toFixed(settings.weightDecimalPrecision)} Kg 
                        ({formData.weft.wastage}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weft-2 Results */}
                {weft2Enabled && results.weft2 && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <h4 className="font-medium text-purple-900 mb-3">Weft 2</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between pb-2 border-b border-purple-200">
                        <span className="text-purple-700">Net Weight:</span>
                        <span className="font-semibold text-purple-900">
                          {(results.weft2.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-purple-700">Gross Weight:</span>
                        <span className="font-bold text-purple-900">
                          {(results.weft2.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                        </span>
                      </div>
                      
                      <div className="flex justify-between pt-2 border-t border-purple-200">
                        <span className="text-purple-700">Weft 2 Cost:</span>
                        <span className="font-bold text-purple-900">
                          {formatCurrency(results.weft2.formattedCost || 0, settings.currencySymbol)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-xs text-purple-600 pt-2">
                        <span>Wastage:</span>
                        <span>
                          {(results.wastage?.weft2 || 0).toFixed(settings.weightDecimalPrecision)} Kg 
                          ({formData.weft2.wastage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                

                {/* Other Cost */}
                {formData.otherCostPerMeter && parseFloat(formData.otherCostPerMeter) > 0 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex justify-between">
                      <span className="text-amber-700">Other Cost per Meter:</span>
                      <span className="font-bold text-amber-900">
                        {formatCurrency(parseFloat(formData.otherCostPerMeter), settings.currencySymbol)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Enhanced Totals Section */}
                <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl text-white shadow-lg">
                  <h4 className="font-semibold mb-4 flex items-center">
                    <span>Final Totals</span>
                  </h4>
                  <div className="space-y-3">
                    {/* NET WEIGHT TOTAL */}
                    <div className="flex justify-between items-center pb-3 border-b border-indigo-400">
                      <div className="flex items-center space-x-2">
                        {/* <Info className="w-4 h-4" /> */}
                        <span className="text-indigo-200">Net Weight:</span>
                      </div>
                      <span className="text-xl font-bold">
                        {(results.totals.totalNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-indigo-200">Gross Weight:</span>
                      <span className="text-2xl font-bold">
                        {(results.totals.totalWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-indigo-400">
                      <span className="text-indigo-200">Total Cost:</span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(results.totals.totalCost || 0, settings.currencySymbol)} /m
                      </span>
                    </div>
                    
                    {/* Wastage Summary */}
                    <div className="mt-4 pt-3 border-t border-indigo-400 bg-indigo-800 bg-opacity-30 rounded-lg p-3">
                      <div className="flex justify-between text-sm text-indigo-100 mb-2">
                        <span className="flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Total Wastage:</span>
                        </span>
                        <span className="font-semibold">
                          {(results.wastage?.total || 0).toFixed(settings.weightDecimalPrecision)} Kg
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-indigo-200">
                        <span>Wastage Impact:</span>
                        <span className="font-semibold">
                          {calculateWastagePercentage(
                            results.totals.totalWeight || 0,
                            results.totals.totalNetWeight || 0
                          ).toFixed(2)}% of net weight
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* NET FABRIC METRICS SECTION - NEW */}
                <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200">
                  <div className="mb-4">
                    <h4 className="font-semibold text-teal-900 flex items-center space-x-2">
                      <Info className="w-5 h-5" />
                      <span>Net Fabric Metrics</span>
                    </h4>
                    <p className="text-xs text-teal-600 mt-1">Without wastage calculations</p>
                  </div>
                  
                  {/* Summary Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-white rounded-lg border border-teal-200">
                      <div className="text-xs text-teal-600 mb-1">Total Net Weight</div>
                      <div className="text-lg font-bold text-teal-900">
                        {(results.totals.totalNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Total Wastage</div>
                      <div className="text-lg font-bold text-red-900">
                        {(results.wastage?.total || 0).toFixed(settings.weightDecimalPrecision)} Kg
                      </div>
                    </div>
                  </div>

                  {/* Expandable Breakdown */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-teal-700 hover:text-teal-900 flex items-center space-x-2 py-2 border-t border-teal-200">
                      <span>View Detailed Breakdown</span>
                      <ChevronDown className="w-4 h-4 transform group-open:rotate-180 transition-transform" />
                    </summary>
                    
                    <div className="mt-3 space-y-3 pb-2">
                      {/* Warp Net & Wastage */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="text-xs text-blue-600">Warp Net</div>
                          <div className="font-semibold text-blue-900">
                            {(results.warp.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                          </div>
                        </div>
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <div className="text-xs text-red-600">Warp Wastage</div>
                          <div className="font-semibold text-red-900">
                            {(results.wastage?.warp || 0).toFixed(settings.weightDecimalPrecision)} Kg
                          </div>
                        </div>
                      </div>

                      {/* Weft Net & Wastage */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <div className="text-xs text-green-600">Weft Net</div>
                          <div className="font-semibold text-green-900">
                            {(results.weft.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                          </div>
                        </div>
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <div className="text-xs text-red-600">Weft Wastage</div>
                          <div className="font-semibold text-red-900">
                            {(results.wastage?.weft || 0).toFixed(settings.weightDecimalPrecision)} Kg
                          </div>
                        </div>
                      </div>

                      {/* Weft-2 Net & Wastage (if enabled) */}
                      {weft2Enabled && results.weft2 && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-purple-50 rounded border border-purple-200">
                            <div className="text-xs text-purple-600">Weft-2 Net</div>
                            <div className="font-semibold text-purple-900">
                              {(results.weft2.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                            </div>
                          </div>
                          <div className="p-2 bg-red-50 rounded border border-red-200">
                            <div className="text-xs text-red-600">Weft-2 Wastage</div>
                            <div className="font-semibold text-red-900">
                              {(results.wastage?.weft2 || 0).toFixed(settings.weightDecimalPrecision)} Kg
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">
                  Fill in the form and click "Calculate" to see results
                </p>
                {/* <div className="flex items-start justify-center mt-4 text-xs text-gray-400 bg-blue-50 p-3 rounded-lg">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-blue-700 mb-1">Net vs Gross Weight:</p>
                    <p className="text-blue-600">• <strong>Net Weight:</strong> Calculated without wastage</p>
                    <p className="text-blue-600">• <strong>Gross Weight:</strong> Includes wastage percentage</p>
                  </div>
                </div> */}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewEstimate;