// frontend/src/pages/ProductionPlanner.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Factory,
  Calculator,
  Save,
  RefreshCw,
  ArrowLeft,
  Gauge,
  CheckCircle,
  Info,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { productionAPI, estimateAPI } from '../services/api';
import { calculateProduction, validateProductionInputs, getEfficiencyRating } from '../utils/productionCalculations';
import { useDebounce } from '../hooks/useDebounce';
import { useNotifications } from '../context/NotificationContext';

const ProductionPlanner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notifySuccess, notifyError } = useNotifications();
  
  // Form state - No default values
  const [formData, setFormData] = useState({
    qualityName: '',
    estimateId: '',
    rpm: '',
    pick: '',
    efficiency: '',
    machines: '',
    workingHours: '',
    workingDaysPerMonth: '',
    notes: ''
  });
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [estimates, setEstimates] = useState([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [errors, setErrors] = useState({});
  const [linkedEstimateInfo, setLinkedEstimateInfo] = useState(null);
  
  // Debounced form data for calculations
  const debouncedFormData = useDebounce(formData, 300);
  
  // Real-time calculation - only calculate if all required fields have values
  const calculations = useMemo(() => {
    const { rpm, pick, efficiency, machines, workingHours, workingDaysPerMonth } = debouncedFormData;
    
    // Check if all required fields have valid values
    if (!rpm || !pick || !efficiency || !machines || !workingHours || !workingDaysPerMonth) {
      return null;
    }
    
    return calculateProduction(debouncedFormData);
  }, [debouncedFormData]);
  
  // Validation state
  const validation = useMemo(() => {
    return validateProductionInputs(formData);
  }, [formData]);
  
  // Efficiency rating
  const efficiencyRating = useMemo(() => {
    if (!formData.efficiency) return null;
    return getEfficiencyRating(formData.efficiency);
  }, [formData.efficiency]);
  
  // Load estimates for linking
  useEffect(() => {
    const fetchEstimates = async () => {
      setLoadingEstimates(true);
      try {
        const response = await estimateAPI.getAll({ limit: 100 });
        console.log('Estimates API response:', response.data);
        setEstimates(response.data.estimates || []);
      } catch (error) {
        console.error('Error fetching estimates:', error);
        notifyError('Failed to load estimates');
      } finally {
        setLoadingEstimates(false);
      }
    };
    fetchEstimates();
  }, [notifyError]);
  
  // Helper function to extract pick value from estimate
  // Based on EstimateDetail.jsx structure: estimate.weft.peek is the pick value
  const extractPickFromEstimate = (estimate) => {
    if (!estimate) return null;
    
    console.log('Extracting pick from estimate:', estimate);
    
    // Primary location: weft.peek (as seen in EstimateDetail.jsx)
    if (estimate.weft?.peek) {
      console.log('Found pick in weft.peek:', estimate.weft.peek);
      return estimate.weft.peek;
    }
    
    // Alternative: weft.pick
    if (estimate.weft?.pick) {
      console.log('Found pick in weft.pick:', estimate.weft.pick);
      return estimate.weft.pick;
    }
    
    // Try ppiDetails if available
    if (estimate.ppiDetails?.ppiPanna) {
      console.log('Found pick in ppiDetails.ppiPanna:', estimate.ppiDetails.ppiPanna);
      return estimate.ppiDetails.ppiPanna;
    }
    
    // Try fabricDetails
    if (estimate.fabricDetails?.pick) {
      console.log('Found pick in fabricDetails.pick:', estimate.fabricDetails.pick);
      return estimate.fabricDetails.pick;
    }
    
    // Direct pick field
    if (estimate.pick) {
      console.log('Found direct pick:', estimate.pick);
      return estimate.pick;
    }
    
    console.log('No pick value found in estimate');
    return null;
  };

  // Helper to get display info for estimate in dropdown
  const getEstimateDisplayInfo = (estimate) => {
    const pick = extractPickFromEstimate(estimate);
    const pickInfo = pick ? ` (Pick: ${pick})` : '';
    return `${estimate.qualityName}${pickInfo}`;
  };
  
  // Check for estimate param in URL
  useEffect(() => {
    const estimateId = searchParams.get('estimateId');
    if (estimateId) {
      const loadEstimate = async () => {
        try {
          const response = await estimateAPI.getOne(estimateId);
          const estimate = response.data;
          
          console.log('Loaded estimate from URL param:', estimate);
          
          // Extract pick value from estimate
          const pickValue = extractPickFromEstimate(estimate);
          
          setFormData(prev => ({
            ...prev,
            estimateId,
            qualityName: estimate.qualityName || '',
            pick: pickValue || prev.pick
          }));
          
          // Store linked estimate info for display
          setLinkedEstimateInfo({
            qualityName: estimate.qualityName,
            weftPeek: estimate.weft?.peek,
            weftPanna: estimate.weft?.panna,
            warpTar: estimate.warp?.tar,
          });
          
          if (pickValue) {
            notifySuccess(`Estimate loaded! Pick set to ${pickValue}`);
          }
        } catch (error) {
          console.error('Error loading estimate:', error);
          notifyError('Failed to load estimate details');
        }
      };
      loadEstimate();
    }
  }, [searchParams, notifyError]);
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = value;
    
    // Parse numeric fields
    if (['rpm', 'pick', 'efficiency', 'machines', 'workingHours', 'workingDaysPerMonth'].includes(name)) {
      parsedValue = value === '' ? '' : parseFloat(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
    
    // Clear field-specific error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Handle estimate selection
  const handleEstimateChange = async (e) => {
    const estimateId = e.target.value;
    setFormData(prev => ({ ...prev, estimateId }));
    
    if (estimateId) {
      try {
        const response = await estimateAPI.getOne(estimateId);
        const estimate = response.data;
        
        console.log('Selected estimate:', estimate);
        console.log('Estimate weft:', estimate.weft);
        console.log('Estimate weft.peek:', estimate.weft?.peek);
        
        // Extract pick value from estimate
        const pickValue = extractPickFromEstimate(estimate);
        
        console.log('Extracted pick value:', pickValue);
        
        setFormData(prev => ({
          ...prev,
          qualityName: estimate.qualityName || prev.qualityName,
          pick: pickValue || prev.pick
        }));
        
        // Store linked estimate info for display
        setLinkedEstimateInfo({
          qualityName: estimate.qualityName,
          weftPeek: estimate.weft?.peek,
          weftPanna: estimate.weft?.panna,
          warpTar: estimate.warp?.tar,
        });
        
        if (pickValue) {
          notifySuccess(`Estimate linked! Pick set to ${pickValue}`);
        } else {
          notifySuccess('Estimate linked (no pick value found)');
        }
      } catch (error) {
        console.error('Error loading estimate details:', error);
        notifyError('Failed to load estimate details');
      }
    } else {
      // Clear linked estimate info when deselected
      setLinkedEstimateInfo(null);
    }
  };
  
  // Check if form is complete for saving
  const isFormComplete = () => {
    const { qualityName, rpm, pick, efficiency, machines, workingHours, workingDaysPerMonth } = formData;
    return (
      qualityName?.trim() &&
      rpm > 0 &&
      pick > 0 &&
      efficiency > 0 && efficiency <= 100 &&
      machines >= 1 &&
      workingHours > 0 && workingHours <= 24 &&
      workingDaysPerMonth >= 1 && workingDaysPerMonth <= 31
    );
  };
  
  // Save production record
  const handleSave = async () => {
    // Validate required fields
    const newErrors = {};
    
    if (!formData.qualityName?.trim()) {
      newErrors.qualityName = 'Quality name is required';
    }
    if (!formData.rpm || formData.rpm <= 0) {
      newErrors.rpm = 'RPM is required';
    }
    if (!formData.pick || formData.pick <= 0) {
      newErrors.pick = 'Pick is required';
    }
    if (!formData.efficiency || formData.efficiency <= 0 || formData.efficiency > 100) {
      newErrors.efficiency = 'Valid efficiency is required';
    }
    if (!formData.machines || formData.machines < 1) {
      newErrors.machines = 'At least 1 machine required';
    }
    if (!formData.workingHours || formData.workingHours <= 0 || formData.workingHours > 24) {
      newErrors.workingHours = 'Valid working hours required';
    }
    if (!formData.workingDaysPerMonth || formData.workingDaysPerMonth < 1 || formData.workingDaysPerMonth > 31) {
      newErrors.workingDaysPerMonth = 'Valid working days required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notifyError('Please fill all required fields');
      return;
    }
    
    setSaving(true);
    try {
      await productionAPI.create(formData);
      notifySuccess('Production record saved successfully!');
      navigate('/productions');
    } catch (error) {
      notifyError(error.response?.data?.message || 'Error saving record');
    } finally {
      setSaving(false);
    }
  };
  
  // Reset form
  const handleReset = () => {
    setFormData({
      qualityName: '',
      estimateId: '',
      rpm: '',
      pick: '',
      efficiency: '',
      machines: '',
      workingHours: '',
      workingDaysPerMonth: '',
      notes: ''
    });
    setErrors({});
    setLinkedEstimateInfo(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Planner</h1>
            <p className="text-gray-500 mt-1">Calculate day-wise grey cloth production</p>
          </div>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Button variant="secondary" icon={RefreshCw} onClick={handleReset}>
            Reset
          </Button>
          <Button
            icon={Save}
            onClick={handleSave}
            disabled={saving || !isFormComplete()}
            loading={saving}
          >
            Save Record
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Factory className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Basic Details</h2>
            </div>
            <div className="space-y-4">
              <Input
                label="Quality Name"
                name="qualityName"
                value={formData.qualityName}
                onChange={handleChange}
                placeholder="Enter fabric quality name"
                required
                error={errors.qualityName}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Estimate (Optional)
                </label>
                <Select
                  name="estimateId"
                  value={formData.estimateId}
                  onChange={handleEstimateChange}
                  disabled={loadingEstimates}
                  options={[
                    { 
                      value: '', 
                      label: loadingEstimates 
                        ? 'Loading estimates...' 
                        : estimates.length > 0 
                          ? 'Select an estimate...' 
                          : 'No estimates available' 
                    },
                    ...estimates.map(e => ({
                      value: e._id,
                      label: getEstimateDisplayInfo(e)
                    }))
                  ]}
                />
                {!loadingEstimates && estimates.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No estimates found. <button 
                      onClick={() => navigate('/estimates/new')}
                      className="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Create one first
                    </button>
                  </p>
                )}
                {estimates.length > 0 && !formData.estimateId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Linking will auto-fill quality name and pick (from weft peek) values
                  </p>
                )}
                
                {/* Linked Estimate Info */}
                {linkedEstimateInfo && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Estimate Linked</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                      <div>
                        <span className="text-green-600">Weft Peek (Pick):</span>{' '}
                        <span className="font-medium">{linkedEstimateInfo.weftPeek || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-green-600">Weft Panna:</span>{' '}
                        <span className="font-medium">{linkedEstimateInfo.weftPanna || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-green-600">Warp Tar:</span>{' '}
                        <span className="font-medium">{linkedEstimateInfo.warpTar || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Loom Parameters */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Gauge className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Loom Parameters</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="RPM (Loom Speed)"
                name="rpm"
                type="number"
                value={formData.rpm}
                onChange={handleChange}
                min={1}
                placeholder="Enter RPM (e.g., 600)"
                helperText="Revolutions per minute"
                error={errors.rpm}
                required
              />
              <div>
                <Input
                  label="Pick (PPI)"
                  name="pick"
                  type="number"
                  value={formData.pick}
                  onChange={handleChange}
                  min={1}
                  placeholder="Enter pick (e.g., 60)"
                  helperText={formData.estimateId ? "Auto-filled from estimate (weft peek)" : "Picks per inch"}
                  error={errors.pick}
                  required
                />
                {formData.estimateId && formData.pick && (
                  <span className="text-xs text-green-600 mt-1 inline-block">
                    ✓ From linked estimate
                  </span>
                )}
              </div>
              <div>
                <Input
                  label="Efficiency (%)"
                  name="efficiency"
                  type="number"
                  value={formData.efficiency}
                  onChange={handleChange}
                  min={0}
                  max={100}
                  placeholder="Enter efficiency (e.g., 85)"
                  helperText="Machine efficiency"
                  error={errors.efficiency}
                  required
                />
                {efficiencyRating && formData.efficiency > 0 && formData.efficiency <= 100 && (
                  <span className={`text-xs font-medium ${efficiencyRating.color} mt-1 inline-block`}>
                    {efficiencyRating.rating}
                  </span>
                )}
              </div>
              <Input
                label="Number of Machines"
                name="machines"
                type="number"
                value={formData.machines}
                onChange={handleChange}
                min={1}
                placeholder="Enter machines (e.g., 4)"
                helperText="Total looms running"
                error={errors.machines}
                required
              />
              <Input
                label="Working Hours/Day"
                name="workingHours"
                type="number"
                value={formData.workingHours}
                onChange={handleChange}
                min={0.5}
                max={24}
                step={0.5}
                placeholder="Enter hours (e.g., 8)"
                helperText="Shift hours per day"
                error={errors.workingHours}
                required
              />
              <Input
                label="Working Days/Month"
                name="workingDaysPerMonth"
                type="number"
                value={formData.workingDaysPerMonth}
                onChange={handleChange}
                min={1}
                max={31}
                placeholder="Enter days (e.g., 26)"
                helperText="For monthly calculation"
                error={errors.workingDaysPerMonth}
                required
              />
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              placeholder="Add any notes about this production plan..."
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{formData.notes.length}/500 characters</p>
          </Card>
        </div>

        {/* Calculation Results */}
        <div className="space-y-6">
          {/* Production Output */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
            <div className="flex items-center space-x-2 mb-4">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Production Output</h2>
            </div>
            
            {calculations ? (
              <div className="space-y-4">
                {/* Daily Production */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Daily Production</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-indigo-600">
                      {calculations.daily.rawProductionMeters.toFixed(2)}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">meters/day</span>
                  </div>
                </div>

                {/* Monthly Production */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-sm text-gray-500 mb-2">Monthly Production</div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-purple-600">
                      {calculations.monthly.rawProduction.toFixed(2)}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">meters/month</span>
                  </div>
                </div>

                {/* Raw Picks */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-sm text-gray-500 mb-2">Raw Picks/Day</div>
                  <div className="text-xl font-semibold text-gray-800">
                    {calculations.daily.rawPicksPerDay.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Enter all parameters to see calculations</p>
                
                {/* Show which fields are missing */}
                <div className="mt-4 text-left">
                  <p className="text-xs text-gray-400 mb-2">Required fields:</p>
                  <div className="space-y-1">
                    {!formData.rpm && (
                      <p className="text-xs text-amber-600">• RPM not set</p>
                    )}
                    {!formData.pick && (
                      <p className="text-xs text-amber-600">• Pick not set {formData.estimateId ? '(check estimate)' : ''}</p>
                    )}
                    {!formData.efficiency && (
                      <p className="text-xs text-amber-600">• Efficiency not set</p>
                    )}
                    {!formData.machines && (
                      <p className="text-xs text-amber-600">• Machines not set</p>
                    )}
                    {!formData.workingHours && (
                      <p className="text-xs text-amber-600">• Working hours not set</p>
                    )}
                    {!formData.workingDaysPerMonth && (
                      <p className="text-xs text-amber-600">• Working days not set</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Quick Fill Presets */}
          <Card>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Fill Presets</h3>
            <div className="space-y-2">
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  rpm: 600,
                  efficiency: 85,
                  machines: 4,
                  workingHours: 8,
                  workingDaysPerMonth: 26
                }))}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="font-medium">Standard Setup</span>
                <span className="text-gray-500 text-xs block">600 RPM, 85% eff, 4 machines, 8 hrs</span>
              </button>
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  rpm: 800,
                  efficiency: 80,
                  machines: 6,
                  workingHours: 12,
                  workingDaysPerMonth: 26
                }))}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="font-medium">High Capacity</span>
                <span className="text-gray-500 text-xs block">800 RPM, 80% eff, 6 machines, 12 hrs</span>
              </button>
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  rpm: 500,
                  efficiency: 90,
                  machines: 2,
                  workingHours: 8,
                  workingDaysPerMonth: 24
                }))}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="font-medium">Small Unit</span>
                <span className="text-gray-500 text-xs block">500 RPM, 90% eff, 2 machines, 8 hrs</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Note: Pick value must be set manually or linked from an estimate
            </p>
          </Card>

          {/* Info Card */}
          <Card>
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-medium text-gray-700">Pick Value Info</h3>
            </div>
            <div className="text-xs text-gray-600 space-y-2">
              <p>
                The <strong>Pick (PPI)</strong> value represents "Picks Per Inch" - 
                the number of weft threads per inch of fabric.
              </p>
              <p>
                When you link an estimate, the pick value is automatically 
                extracted from the <strong>Weft Peek</strong> field of that estimate.
              </p>
              <p className="text-blue-600">
                Tip: If pick doesn't auto-fill, the linked estimate may not have 
                a weft peek value set.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductionPlanner;