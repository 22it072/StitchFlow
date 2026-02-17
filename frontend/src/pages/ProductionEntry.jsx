// frontend/src/pages/ProductionEntry.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  Factory,
  PackageCheck,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Info,
  Zap,
  Activity,
  Target,
  X,
  User,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import { weavingProductionAPI, loomAPI, weavingSetAPI } from '../services/weavingApi';
import { useCompany } from '../context/CompanyContext';
import { useNotifications } from '../context/NotificationContext';
import toast from 'react-hot-toast';

const ProductionEntry = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { notifySuccess } = useNotifications();
  
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [looms, setLooms] = useState([]);
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedLoom, setSelectedLoom] = useState(null);
  
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    shift: 'General',
    loomId: '',
    setId: '',
    beamId: '',
    operatorName: '',
    startTime: '',
    endTime: '',
    metersProduced: '',
    defectCount: 0,
    defectTypes: [],
    defectDescription: '',
    loomStoppageTime: 0,
    stoppageReason: 'None',
    remarks: '',
  });

  const [newDefectType, setNewDefectType] = useState('');
  const [errors, setErrors] = useState({});
  const [calculatedMetrics, setCalculatedMetrics] = useState(null);

  useEffect(() => {
    if (activeCompany?._id) {
      fetchData();
    }
  }, [activeCompany?._id]);

  useEffect(() => {
    if (formData.setId) {
      const set = sets.find(s => s._id === formData.setId);
      setSelectedSet(set);
      // Auto-populate beam if set has one
      if (set?.allocatedBeamId) {
        setFormData(prev => ({ ...prev, beamId: set.allocatedBeamId._id }));
      }
    } else {
      setSelectedSet(null);
    }
  }, [formData.setId, sets]);

  useEffect(() => {
    if (formData.loomId) {
      const loom = looms.find(l => l._id === formData.loomId);
      setSelectedLoom(loom);
    } else {
      setSelectedLoom(null);
    }
  }, [formData.loomId, looms]);

  useEffect(() => {
    calculateMetrics();
  }, [formData.startTime, formData.endTime, formData.metersProduced, formData.loomStoppageTime]);

  const fetchData = async () => {
    try {
      setFetchingData(true);
      console.log('Fetching data for company:', activeCompany?._id);
      
      const [loomsRes, setsRes] = await Promise.all([
        loomAPI.getAll({}, activeCompany?._id),
        weavingSetAPI.getAll({}, activeCompany?._id),
      ]);
      
      console.log('Looms response:', loomsRes.data);
      console.log('Sets response:', setsRes.data);
      
      setLooms(loomsRes.data.looms || loomsRes.data || []);
      
      // Filter sets to only show those available for production
      const allSets = setsRes.data.sets || setsRes.data || [];
      const availableSets = allSets.filter(set => 
        set.status === 'Pending' || set.status === 'In Progress'
      );
      
      console.log('Available sets for production:', availableSets);
      setSets(availableSets);
      
      if (availableSets.length === 0) {
        toast.info('No active weaving sets available. Create a set first.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setFetchingData(false);
    }
  };

  const calculateMetrics = () => {
    if (!formData.startTime || !formData.endTime || !formData.metersProduced) {
      setCalculatedMetrics(null);
      return;
    }

    // Parse times
    const [startHour, startMin] = formData.startTime.split(':').map(Number);
    const [endHour, endMin] = formData.endTime.split(':').map(Number);
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts

    const totalHours = totalMinutes / 60;
    const stoppageMinutes = Number(formData.loomStoppageTime) || 0;
    const productiveMinutes = totalMinutes - stoppageMinutes;
    const productiveHours = productiveMinutes / 60;

    const metersProduced = Number(formData.metersProduced);
    const metersPerHour = productiveHours > 0 ? metersProduced / productiveHours : 0;
    
    // Calculate efficiency: (Productive Hours / Total Hours) * 100
    const efficiency = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

    setCalculatedMetrics({
      totalHours: totalHours.toFixed(2),
      productiveHours: productiveHours.toFixed(2),
      stoppageHours: (stoppageMinutes / 60).toFixed(2),
      metersPerHour: metersPerHour.toFixed(2),
      calculatedEfficiency: Math.min(efficiency, 100).toFixed(1),
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.entryDate) newErrors.entryDate = 'Date is required';
    if (!formData.shift) newErrors.shift = 'Shift is required';
    if (!formData.loomId) newErrors.loomId = 'Please select a loom';
    if (!formData.setId) newErrors.setId = 'Please select a weaving set';
    if (!formData.operatorName?.trim()) newErrors.operatorName = 'Operator name is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    
    const metersProduced = Number(formData.metersProduced);
    if (!formData.metersProduced || isNaN(metersProduced) || metersProduced <= 0) {
      newErrors.metersProduced = 'Meters produced must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setLoading(true);
      
      // Create Date objects for start and end time
      const entryDate = new Date(formData.entryDate);
      
      const [startHour, startMin] = formData.startTime.split(':');
      const startTime = new Date(entryDate);
      startTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const [endHour, endMin] = formData.endTime.split(':');
      const endTime = new Date(entryDate);
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
      
      // If end time is before start time, assume it's next day
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      // Build the payload matching backend model exactly
      const payload = {
        entryDate: formData.entryDate,
        shift: formData.shift,
        loomId: formData.loomId,
        setId: formData.setId,
        operatorName: formData.operatorName.trim(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metersProduced: parseFloat(formData.metersProduced),
      };

      // Add optional beam
      if (formData.beamId) {
        payload.beamId = formData.beamId;
      }

      // Add defects if any
      if (formData.defectCount > 0 || formData.defectTypes.length > 0 || formData.defectDescription) {
        payload.defects = {
          count: parseInt(formData.defectCount) || 0,
          types: formData.defectTypes || [],
          description: formData.defectDescription?.trim() || '',
        };
      }

      // Add stoppage info
      if (formData.loomStoppageTime > 0) {
        payload.loomStoppageTime = parseFloat(formData.loomStoppageTime);
      }
      
      if (formData.stoppageReason && formData.stoppageReason !== 'None') {
        payload.stoppageReason = formData.stoppageReason;
      }

      // Add remarks
      if (formData.remarks?.trim()) {
        payload.remarks = formData.remarks.trim();
      }

      console.log('Submitting production entry payload:', JSON.stringify(payload, null, 2));

      const response = await weavingProductionAPI.create(payload, activeCompany?._id);
      
      console.log('Production entry created:', response.data);
      
      if (notifySuccess) {
        notifySuccess('Production entry saved successfully');
      }
      toast.success('Production entry saved successfully');
      
      // Navigate back to production list
      navigate('/weaving/production');
      
    } catch (error) {
      console.error('Error saving production entry:', error);
      console.error('Error response data:', error.response?.data);
      
      // Handle different error types
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('Failed to save production entry');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDefectType = () => {
    if (!newDefectType.trim()) {
      toast.error('Please enter a defect type');
      return;
    }

    if (!formData.defectTypes.includes(newDefectType)) {
      setFormData({
        ...formData,
        defectTypes: [...formData.defectTypes, newDefectType],
      });
      setNewDefectType('');
    } else {
      toast.error('This defect type is already added');
    }
  };

  const handleRemoveDefectType = (type) => {
    setFormData({
      ...formData,
      defectTypes: formData.defectTypes.filter(t => t !== type),
    });
  };

  // Shift options
  const shiftOptions = [
    { value: 'General', label: 'General', icon: '⏰' },
    { value: 'Day', label: 'Day Shift', icon: '☀️' },
    { value: 'Night', label: 'Night Shift', icon: '🌙' },
  ];

  // Defect type options matching backend enum
  const defectTypeOptions = [
    { value: 'Broken End', label: 'Broken End' },
    { value: 'Missing Pick', label: 'Missing Pick' },
    { value: 'Reed Mark', label: 'Reed Mark' },
    { value: 'Stain', label: 'Stain' },
    { value: 'Wrong Pattern', label: 'Wrong Pattern' },
    { value: 'Other', label: 'Other' },
  ];

  // Stoppage reason options matching backend enum
  const stoppageReasonOptions = [
    { value: 'None', label: 'None' },
    { value: 'Breakdown', label: 'Breakdown' },
    { value: 'Power Cut', label: 'Power Cut' },
    { value: 'No Beam', label: 'No Beam' },
    { value: 'Yarn Issue', label: 'Yarn Issue' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Other', label: 'Other' },
  ];

  // Loom options
  const loomOptions = looms
    .filter(l => l.status === 'Active' || l.status === 'Idle')
    .map(loom => ({
      value: loom._id,
      label: `Loom ${loom.loomNumber}`,
      description: `${loom.loomType} - ${loom.status}`,
    }));

  // Set options with better descriptions
  const setOptions = sets.map(set => ({
    value: set._id,
    label: `Set ${set.setNumber}`,
    description: `${set.qualityName || 'No quality'} - ${set.partyId?.partyName || 'No party'}`,
  }));

  if (fetchingData) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/weaving/production')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Production Entry</h1>
            <p className="text-gray-500 mt-1">Record daily weaving production data</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/weaving/production')}
          >
            Cancel
          </Button>
          <Button
            icon={Save}
            onClick={handleSubmit}
            loading={loading}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700"
          >
            Save Entry
          </Button>
        </div>
      </div>

      {/* Show warning if no sets available */}
      {sets.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 mb-1">No Active Weaving Sets</p>
              <p className="text-sm text-amber-700">
                There are no weaving sets available for production entry. 
                Please create a weaving set first and set its status to "Pending" or "In Progress".
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/weaving/sets')}
                className="mt-3"
              >
                Go to Weaving Sets
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Production Date"
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                required
                icon={Calendar}
                error={errors.entryDate}
              />

              <Select
                label="Shift"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                options={shiftOptions}
                required
              />

              <div className="md:col-span-2">
                <Input
                  label="Operator Name"
                  value={formData.operatorName}
                  onChange={(e) => {
                    setFormData({ ...formData, operatorName: e.target.value });
                    setErrors({ ...errors, operatorName: '' });
                  }}
                  placeholder="Enter operator name"
                  icon={User}
                  required
                  error={errors.operatorName}
                />
              </div>
            </div>
          </Card>

          {/* Loom & Set Selection */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Factory className="w-5 h-5 text-indigo-600" />
              Loom & Set Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Select Loom"
                value={formData.loomId}
                onChange={(e) => {
                  setFormData({ ...formData, loomId: e.target.value });
                  setErrors({ ...errors, loomId: '' });
                }}
                options={loomOptions}
                placeholder="Choose a loom"
                required
                searchable
                error={errors.loomId}
              />

              <Select
                label="Select Weaving Set"
                value={formData.setId}
                onChange={(e) => {
                  setFormData({ ...formData, setId: e.target.value });
                  setErrors({ ...errors, setId: '' });
                }}
                options={setOptions}
                placeholder="Choose a set"
                required
                searchable
                error={errors.setId}
              />
            </div>

            {selectedSet && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Selected Set Details
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                      <div>Quality: {selectedSet.qualityName || 'N/A'}</div>
                      <div>Party: {selectedSet.partyId?.partyName || 'N/A'}</div>
                      <div>Order: {selectedSet.orderQuantity} {selectedSet.quantityUnit}</div>
                      <div>Produced: {selectedSet.producedQuantity || 0} {selectedSet.quantityUnit}</div>
                      <div>Remaining: {(selectedSet.orderQuantity - (selectedSet.producedQuantity || 0))} {selectedSet.quantityUnit}</div>
                      {selectedSet.targetMetersPerDay && (
                        <div>Target/Day: {selectedSet.targetMetersPerDay}m</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Time & Production */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Time & Production Data
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={(e) => {
                  setFormData({ ...formData, startTime: e.target.value });
                  setErrors({ ...errors, startTime: '' });
                }}
                required
                icon={Clock}
                error={errors.startTime}
              />

              <Input
                label="End Time"
                type="time"
                value={formData.endTime}
                onChange={(e) => {
                  setFormData({ ...formData, endTime: e.target.value });
                  setErrors({ ...errors, endTime: '' });
                }}
                required
                icon={Clock}
                error={errors.endTime}
              />

              <div className="md:col-span-2">
                <Input
                  label="Meters Produced"
                  type="number"
                  step="0.01"
                  value={formData.metersProduced}
                  onChange={(e) => {
                    setFormData({ ...formData, metersProduced: e.target.value });
                    setErrors({ ...errors, metersProduced: '' });
                  }}
                  required
                  placeholder="e.g., 450.50"
                  icon={Target}
                  error={errors.metersProduced}
                />
                {calculatedMetrics && (
                  <p className="text-xs text-gray-500 mt-1">
                    Rate: {calculatedMetrics.metersPerHour} m/hr
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Defects */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Quality Tracking (Optional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Defect Count"
                type="number"
                min="0"
                value={formData.defectCount}
                onChange={(e) => setFormData({ ...formData, defectCount: e.target.value })}
                placeholder="e.g., 5"
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Add Defect Type</label>
                <div className="flex gap-2">
                  <Select
                    value={newDefectType}
                    onChange={(e) => setNewDefectType(e.target.value)}
                    options={defectTypeOptions}
                    placeholder="Select defect type"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddDefectType}
                    disabled={!newDefectType}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {formData.defectTypes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.defectTypes.map((type, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200"
                  >
                    {type}
                    <button
                      onClick={() => handleRemoveDefectType(type)}
                      className="hover:bg-amber-100 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Defect Description
              </label>
              <textarea
                value={formData.defectDescription}
                onChange={(e) => setFormData({ ...formData, defectDescription: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="Describe the defects (optional)..."
              />
            </div>
          </Card>

          {/* Stoppages */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-600" />
              Downtime Tracking (Optional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Stoppage Time (minutes)"
                type="number"
                min="0"
                value={formData.loomStoppageTime}
                onChange={(e) => setFormData({ ...formData, loomStoppageTime: e.target.value })}
                placeholder="e.g., 30"
              />

              <Select
                label="Stoppage Reason"
                value={formData.stoppageReason}
                onChange={(e) => setFormData({ ...formData, stoppageReason: e.target.value })}
                options={stoppageReasonOptions}
              />
            </div>
          </Card>

          {/* Remarks */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h3>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Add any additional remarks..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.remarks.length}/500 characters
            </p>
          </Card>
        </div>

        {/* Sidebar - Calculated Metrics */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Calculated Metrics
            </h3>

            {calculatedMetrics ? (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {calculatedMetrics.totalHours} hrs
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <p className="text-sm text-green-600 mb-1">Productive Hours</p>
                  <p className="text-2xl font-bold text-green-900">
                    {calculatedMetrics.productiveHours} hrs
                  </p>
                </div>

                {formData.loomStoppageTime > 0 && (
                  <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                    <p className="text-sm text-red-600 mb-1">Stoppage Time</p>
                    <p className="text-2xl font-bold text-red-900">
                      {calculatedMetrics.stoppageHours} hrs
                    </p>
                  </div>
                )}

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <p className="text-sm text-purple-600 mb-1">Production Rate</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {calculatedMetrics.metersPerHour} m/hr
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                  <p className="text-sm text-indigo-600 mb-1">Efficiency</p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {calculatedMetrics.calculatedEfficiency}%
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    Productive / Total time
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Enter time and production data to see calculated metrics
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductionEntry;