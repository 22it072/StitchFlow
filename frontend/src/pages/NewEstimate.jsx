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
  TrendingUp,
  Layers,
  DollarSign,
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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4"></div>
        <p className="text-slate-500 text-sm">Loading estimate...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                {isEditing ? 'Edit Estimate' : 'New Estimate'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <p className="text-slate-600">Calculate grey cloth weight and cost</p>
                {!isEditing && (
                  <>
                    {autoSaveStatus === 'saving' && (
                      <span className="flex items-center text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-1.5" />
                        Saving draft...
                      </span>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <span className="flex items-center text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3 mr-1" />
                        Draft saved
                      </span>
                    )}
                    {lastAutoSave && autoSaveStatus === 'idle' && (
                      <span className="text-xs text-slate-400">
                        Last saved: {lastAutoSave.toLocaleTimeString()}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
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
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Calculate
              </Button>
              <Button
                icon={Save}
                onClick={handleSave}
                loading={saving}
                disabled={!results}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isEditing ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column - Form Inputs */}
          <div className="lg:col-span-8 space-y-6 md:space-y-8 animate-fade-in">
            
            {/* Quality Name */}
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 md:p-8 border border-slate-200">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <Info className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-800">Quality Details</h3>
              </div>
              <Input
                label="Quality Name / Cloth Name"
                value={formData.qualityName}
                onChange={(e) => handleChange('root', 'qualityName', e.target.value)}
                placeholder="e.g., Cotton Silk 120GSM"
                required
                className="text-base"
              />
            </div>

            {/* Warp Section */}
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 md:p-8 border border-slate-200">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Warp Details</h3>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  Required
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <div className="sm:col-span-2 xl:col-span-3">
                  <Select
                    label="Select Yarn"
                    value={formData.warp.yarnId}
                    onChange={(e) => handleYarnSelect('warp', e.target.value)}
                    options={getYarnOptions('warp')}
                    placeholder="Choose a yarn"
                    className="text-base min-h-[48px]"
                  />
                </div>
                <Input
                  label="Tar"
                  type="number"
                  step="0.01"
                  value={formData.warp.tar}
                  onChange={(e) => handleChange('warp', 'tar', e.target.value)}
                  placeholder="Enter tar value"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="Denier"
                  type="number"
                  step="0.01"
                  value={formData.warp.denier}
                  onChange={(e) => handleChange('warp', 'denier', e.target.value)}
                  placeholder="Denier"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="Wastage (%)"
                  type="number"
                  step="0.01"
                  value={formData.warp.wastage}
                  onChange={(e) => handleChange('warp', 'wastage', e.target.value)}
                  placeholder="e.g., 3"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="Yarn Price"
                  type="number"
                  step="0.01"
                  value={formData.warp.yarnPrice}
                  onChange={(e) => handleChange('warp', 'yarnPrice', e.target.value)}
                  placeholder="Price"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="GST (%)"
                  type="number"
                  step="0.01"
                  value={formData.warp.yarnGst}
                  onChange={(e) => handleChange('warp', 'yarnGst', e.target.value)}
                  placeholder="GST %"
                  required
                  className="text-base min-h-[48px]"
                />
              </div>
            </div>

            {/* Weft Section */}
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 md:p-8 border border-slate-200">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Weft Details</h3>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  Required
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <div className="sm:col-span-2 xl:col-span-3">
                  <Select
                    label="Select Yarn"
                    value={formData.weft.yarnId}
                    onChange={(e) => handleYarnSelect('weft', e.target.value)}
                    options={getYarnOptions('weft')}
                    placeholder="Choose a yarn"
                    className="text-base min-h-[48px]"
                  />
                </div>
                <Input
                  label="Peek"
                  type="number"
                  step="0.01"
                  value={formData.weft.peek}
                  onChange={(e) => handleChange('weft', 'peek', e.target.value)}
                  placeholder="Enter peek value"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="Panna"
                  type="number"
                  step="0.01"
                  value={formData.weft.panna}
                  onChange={(e) => handleChange('weft', 'panna', e.target.value)}
                  placeholder="Enter panna value"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="Denier"
                  type="number"
                  step="0.01"
                  value={formData.weft.denier}
                  onChange={(e) => handleChange('weft', 'denier', e.target.value)}
                  placeholder="Denier"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="Wastage (%)"
                  type="number"
                  step="0.01"
                  value={formData.weft.wastage}
                  onChange={(e) => handleChange('weft', 'wastage', e.target.value)}
                  placeholder="e.g., 3"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="Yarn Price"
                  type="number"
                  step="0.01"
                  value={formData.weft.yarnPrice}
                  onChange={(e) => handleChange('weft', 'yarnPrice', e.target.value)}
                  placeholder="Price"
                  required
                  className="text-base min-h-[48px]"
                />
                <Input
                  label="GST (%)"
                  type="number"
                  step="0.01"
                  value={formData.weft.yarnGst}
                  onChange={(e) => handleChange('weft', 'yarnGst', e.target.value)}
                  placeholder="GST %"
                  required
                  className="text-base min-h-[48px]"
                />
              </div>
            </div>

            {/* Weft-2 Section (Collapsible on Mobile) */}
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 md:p-8 border border-slate-200">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Weft-2 Details</h3>
                  <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    Optional
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={weft2Enabled}
                    onChange={(e) => setWeft2Enabled(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition min-h-[20px]"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition">
                    Enable Weft-2
                  </span>
                </label>
              </div>

              {weft2Enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in">
                  <div className="sm:col-span-2 xl:col-span-3">
                    <Select
                      label="Select Yarn"
                      value={formData.weft2.yarnId}
                      onChange={(e) => handleYarnSelect('weft2', e.target.value)}
                      options={getYarnOptions('weft-2')}
                      placeholder="Choose a yarn"
                      className="text-base min-h-[48px]"
                    />
                  </div>
                  <Input
                    label="Peek-2"
                    type="number"
                    step="0.01"
                    value={formData.weft2.peek}
                    onChange={(e) => handleChange('weft2', 'peek', e.target.value)}
                    placeholder="Enter peek value"
                    className="text-base min-h-[48px]"
                  />
                  <Input
                    label="Panna-2"
                    type="number"
                    step="0.01"
                    value={formData.weft2.panna}
                    onChange={(e) => handleChange('weft2', 'panna', e.target.value)}
                    placeholder="Enter panna value"
                    className="text-base min-h-[48px]"
                  />
                  <Input
                    label="Denier"
                    type="number"
                    step="0.01"
                    value={formData.weft2.denier}
                    onChange={(e) => handleChange('weft2', 'denier', e.target.value)}
                    placeholder="Denier"
                    className="text-base min-h-[48px]"
                  />
                  <Input
                    label="Wastage (%)"
                    type="number"
                    step="0.01"
                    value={formData.weft2.wastage}
                    onChange={(e) => handleChange('weft2', 'wastage', e.target.value)}
                    placeholder="e.g., 3"
                    className="text-base min-h-[48px]"
                  />
                  <Input
                    label="Yarn Price"
                    type="number"
                    step="0.01"
                    value={formData.weft2.yarnPrice}
                    onChange={(e) => handleChange('weft2', 'yarnPrice', e.target.value)}
                    placeholder="Price"
                    className="text-base min-h-[48px]"
                  />
                  <Input
                    label="GST (%)"
                    type="number"
                    step="0.01"
                    value={formData.weft2.yarnGst}
                    onChange={(e) => handleChange('weft2', 'yarnGst', e.target.value)}
                    placeholder="GST %"
                    className="text-base min-h-[48px]"
                  />
                </div>
              )}
            </div>

            {/* Other Cost */}
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 md:p-8 border border-slate-200">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-slate-800">Additional Costs</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Other Cost per Meter"
                  type="number"
                  step="0.01"
                  value={formData.otherCostPerMeter}
                  onChange={(e) => handleChange('root', 'otherCostPerMeter', e.target.value)}
                  placeholder="e.g., 0.50"
                  className="text-base min-h-[48px]"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 md:p-8 border border-slate-200">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <Info className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-800">Notes & Tags</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('root', 'notes', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 text-base rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                    placeholder="Add any notes about this estimate..."
                  />
                </div>
                <Input
                  label="Tags (comma separated)"
                  value={formData.tags}
                  onChange={(e) => handleChange('root', 'tags', e.target.value)}
                  placeholder="e.g., cotton, premium, summer"
                  className="text-base min-h-[48px]"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Results Panel (Sticky) */}
          <div className="lg:col-span-4">
            <div className="sticky top-28">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Header with gradient strip */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Calculation Results</h3>
                    </div>
                    {showResults && (
                      <button
                        onClick={handleCalculate}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                        title="Recalculate"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {showResults && results ? (
                    <div className="space-y-4 animate-fade-in">
                      {/* Warp Results */}
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200 transition-all hover:shadow-md">
                        <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          Warp
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                            <span className="text-blue-700 font-medium">Net Weight:</span>
                            <span className="font-bold text-blue-900 tabular-nums">
                              {(results.warp.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-blue-700 font-medium">Gross Weight:</span>
                            <span className="font-bold text-blue-900 text-lg tabular-nums">
                              {(results.warp.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                            <span className="text-blue-700 font-medium">Cost:</span>
                            <span className="font-bold text-blue-900 text-lg tabular-nums">
                              {formatCurrency(results.warp.formattedCost || 0, settings.currencySymbol)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-xs text-blue-600 pt-2 bg-blue-50 rounded-lg px-3 py-2">
                            <span>Wastage:</span>
                            <span className="font-medium tabular-nums">
                              {(results.wastage?.warp || 0).toFixed(settings.weightDecimalPrecision)} Kg 
                              <span className="ml-1 text-blue-500">({formData.warp.wastage}%)</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Weft Results */}
                      <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-2xl border border-green-200 transition-all hover:shadow-md">
                        <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full" />
                          Weft
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center pb-3 border-b border-green-200">
                            <span className="text-green-700 font-medium">Net Weight:</span>
                            <span className="font-bold text-green-900 tabular-nums">
                              {(results.weft.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-green-700 font-medium">Gross Weight:</span>
                            <span className="font-bold text-green-900 text-lg tabular-nums">
                              {(results.weft.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-green-200">
                            <span className="text-green-700 font-medium">Cost:</span>
                            <span className="font-bold text-green-900 text-lg tabular-nums">
                              {formatCurrency(results.weft.formattedCost || 0, settings.currencySymbol)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-xs text-green-600 pt-2 bg-green-50 rounded-lg px-3 py-2">
                            <span>Wastage:</span>
                            <span className="font-medium tabular-nums">
                              {(results.wastage?.weft || 0).toFixed(settings.weightDecimalPrecision)} Kg 
                              <span className="ml-1 text-green-500">({formData.weft.wastage}%)</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Weft-2 Results */}
                      {weft2Enabled && results.weft2 && (
                        <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-200 transition-all hover:shadow-md">
                          <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-600 rounded-full" />
                            Weft 2
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center pb-3 border-b border-purple-200">
                              <span className="text-purple-700 font-medium">Net Weight:</span>
                              <span className="font-bold text-purple-900 tabular-nums">
                                {(results.weft2.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-purple-700 font-medium">Gross Weight:</span>
                              <span className="font-bold text-purple-900 text-lg tabular-nums">
                                {(results.weft2.formattedWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center pt-3 border-t border-purple-200">
                              <span className="text-purple-700 font-medium">Cost:</span>
                              <span className="font-bold text-purple-900 text-lg tabular-nums">
                                {formatCurrency(results.weft2.formattedCost || 0, settings.currencySymbol)}
                              </span>
                            </div>
                            
                            <div className="flex justify-between text-xs text-purple-600 pt-2 bg-purple-50 rounded-lg px-3 py-2">
                              <span>Wastage:</span>
                              <span className="font-medium tabular-nums">
                                {(results.wastage?.weft2 || 0).toFixed(settings.weightDecimalPrecision)} Kg 
                                <span className="ml-1 text-purple-500">({formData.weft2.wastage}%)</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Other Cost */}
                      {formData.otherCostPerMeter && parseFloat(formData.otherCostPerMeter) > 0 && (
                        <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border border-amber-200">
                          <div className="flex justify-between items-center">
                            <span className="text-amber-800 font-medium">Other Cost/Meter:</span>
                            <span className="font-bold text-amber-900 text-lg tabular-nums">
                              {formatCurrency(parseFloat(formData.otherCostPerMeter), settings.currencySymbol)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Final Totals - Fixed to 2 decimals */}
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 shadow-2xl">
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                        <div className="relative z-10">
                          <h4 className="font-bold mb-5 flex items-center text-white">
                            <span className="text-lg">Final Totals</span>
                          </h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-white/20">
                              <span className="text-indigo-100 font-medium">Net Weight:</span>
                              <span className="text-2xl font-bold text-white tabular-nums transition-all">
                                {(results.totals.totalNetWeight || 0).toFixed(2)} Kg
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-indigo-100 font-medium">Gross Weight:</span>
                              <span className="text-3xl font-bold text-white tabular-nums transition-all">
                                {(results.totals.totalWeight || 0).toFixed(2)} Kg
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center pt-4 border-t border-white/20">
                              <span className="text-indigo-100 font-medium">Total Cost:</span>
                              <span className="text-3xl font-bold text-white tabular-nums transition-all">
                                {formatCurrency(results.totals.totalCost || 0, settings.currencySymbol)} /m
                              </span>
                            </div>
                            
                            {/* Wastage Summary */}
                            <div className="mt-5 pt-4 border-t border-white/20 bg-white/10 backdrop-blur-md rounded-xl p-4">
                              <div className="flex justify-between text-sm text-indigo-50 mb-2">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <AlertCircle className="w-4 h-4" />
                                  Total Wastage:
                                </span>
                                <span className="font-bold text-white tabular-nums">
                                  {(results.wastage?.total || 0).toFixed(2)} Kg
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-indigo-100">
                                <span>Wastage Impact:</span>
                                <span className="font-semibold tabular-nums">
                                  {calculateWastagePercentage(
                                    results.totals.totalWeight || 0,
                                    results.totals.totalNetWeight || 0
                                  ).toFixed(2)}% of net weight
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Net Fabric Metrics - Collapsible */}
                      <details className="group bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200 overflow-hidden">
                        <summary className="cursor-pointer p-5 hover:bg-teal-100/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Info className="w-5 h-5 text-teal-700" />
                              <h4 className="font-semibold text-teal-900">Net Fabric Metrics</h4>
                            </div>
                            <ChevronDown className="w-5 h-5 text-teal-600 transform group-open:rotate-180 transition-transform" />
                          </div>
                          <p className="text-xs text-teal-600 mt-1 ml-7">Without wastage calculations</p>
                        </summary>
                        
                        <div className="p-5 pt-0 animate-fade-in">
                          {/* Summary Metrics */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-4 bg-white rounded-xl border border-teal-200 shadow-sm">
                              <div className="text-xs text-teal-600 mb-1.5 font-medium">Total Net Weight</div>
                              <div className="text-xl font-bold text-teal-900 tabular-nums">
                                {(results.totals.totalNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                              </div>
                            </div>
                            <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-sm">
                              <div className="text-xs text-rose-600 mb-1.5 font-medium">Total Wastage</div>
                              <div className="text-xl font-bold text-rose-900 tabular-nums">
                                {(results.wastage?.total || 0).toFixed(settings.weightDecimalPrecision)} Kg
                              </div>
                            </div>
                          </div>

                          {/* Detailed Breakdown */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs text-blue-600 font-medium mb-1">Warp Net</div>
                                <div className="font-bold text-blue-900 tabular-nums">
                                  {(results.warp.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                                </div>
                              </div>
                              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                                <div className="text-xs text-rose-600 font-medium mb-1">Warp Wastage</div>
                                <div className="font-bold text-rose-900 tabular-nums">
                                  {(results.wastage?.warp || 0).toFixed(settings.weightDecimalPrecision)} Kg
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="text-xs text-green-600 font-medium mb-1">Weft Net</div>
                                <div className="font-bold text-green-900 tabular-nums">
                                  {(results.weft.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                                </div>
                              </div>
                              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                                <div className="text-xs text-rose-600 font-medium mb-1">Weft Wastage</div>
                                <div className="font-bold text-rose-900 tabular-nums">
                                  {(results.wastage?.weft || 0).toFixed(settings.weightDecimalPrecision)} Kg
                                </div>
                              </div>
                            </div>

                            {weft2Enabled && results.weft2 && (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="text-xs text-purple-600 font-medium mb-1">Weft-2 Net</div>
                                  <div className="font-bold text-purple-900 tabular-nums">
                                    {(results.weft2.formattedNetWeight || 0).toFixed(settings.weightDecimalPrecision)} Kg
                                  </div>
                                </div>
                                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                                  <div className="text-xs text-rose-600 font-medium mb-1">Weft-2 Wastage</div>
                                  <div className="font-bold text-rose-900 tabular-nums">
                                    {(results.wastage?.weft2 || 0).toFixed(settings.weightDecimalPrecision)} Kg
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-2xl mb-5">
                        <Calculator className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium mb-2">
                        Ready to Calculate
                      </p>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Fill in the form and click "Calculate" to see your estimation results
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40 safe-bottom">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            icon={Calculator}
            onClick={handleCalculate}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 min-h-[48px] text-base font-medium"
          >
            Calculate
          </Button>
          <Button
            icon={Save}
            onClick={handleSave}
            loading={saving}
            disabled={!results}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 min-h-[48px] text-base font-medium"
          >
            {isEditing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewEstimate;