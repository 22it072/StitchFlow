// frontend/src/pages/NewChallan.jsx (Fixed - No Infinite Loop)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  Plus,
  Trash2,
  Calculator,
  AlertCircle,
  Package,
  User,
  Calendar,
  TrendingUp,
  ArrowLeft,
  CheckCircle,
  X,
  Info,
  RefreshCw,
  FileText,
  DollarSign,
  Scale,
  Ruler,
  Building2,
  Clock,
  Percent,
  Search,
  CreditCard,
  ShoppingBag,
  Layers,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import { challanAPI, partyAPI, estimateAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import {
  calculateItemTotals,
  calculateChallanTotals,
  formatCurrency,
} from '../utils/challanCalculations';
import toast from 'react-hot-toast';

const NewChallan = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  
  const [formData, setFormData] = useState({
    partyId: '',
    issueDate: new Date().toISOString().split('T')[0],
    paymentTermsDays: 30,
    notes: '',
    items: [],
  });
  
  const [totals, setTotals] = useState({
    totalMeters: 0,
    totalWeight: 0,
    subtotalAmount: 0,
  });

  const [errors, setErrors] = useState({});

  // Fetch initial data
  useEffect(() => {
    fetchParties();
    fetchEstimates();
  }, []);

  // Update selected party when partyId changes
  useEffect(() => {
    if (formData.partyId) {
      const party = parties.find(p => p._id === formData.partyId);
      setSelectedParty(party);
      if (party && party.paymentTermsDays !== formData.paymentTermsDays) {
        setFormData(prev => ({
          ...prev,
          paymentTermsDays: party.paymentTermsDays || 30,
        }));
      }
    } else {
      setSelectedParty(null);
    }
  }, [formData.partyId, parties]);

  // Calculate totals when items change
  useEffect(() => {
    if (formData.items.length === 0) {
      setTotals({ totalMeters: 0, totalWeight: 0, subtotalAmount: 0 });
    } else {
      const calculatedTotals = calculateChallanTotals(formData.items);
      setTotals(calculatedTotals);
    }
  }, [formData.items]);

  const fetchParties = async () => {
    try {
      const response = await partyAPI.getAll({ active: true });
      setParties(response.data.parties);
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('Failed to load parties');
    }
  };

  const fetchEstimates = async () => {
    try {
      const response = await estimateAPI.getAll({ limit: 1000 });
      setEstimates(response.data.estimates);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
    }
  };

  const addItem = () => {
    const newItemId = Date.now();
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: newItemId,
          estimateId: '',
          orderedMeters: 0,
          qualityName: '',
          panna: 0,
          pricePerMeter: 0,
          weightPerMeter: 0,
          calculatedWeight: 0,
          calculatedAmount: 0,
        },
      ],
    }));
    setExpandedItems(prev => ({ ...prev, [newItemId]: true }));
  };

  const removeItem = (index) => {
    const itemId = formData.items[index].id;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setExpandedItems(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    // Clear error for this item
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[`item_${index}`];
      return updated;
    });
  };

  const toggleItemExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleEstimateSelect = (index, estimateId) => {
    const estimate = estimates.find(e => e._id === estimateId);
    if (!estimate) return;

    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      estimateId: estimate._id,
      qualityName: estimate.qualityName,
      panna: estimate.weft?.panna || 0,
      pricePerMeter: estimate.totalCost || 0,
      weightPerMeter: estimate.totalNetWeight || estimate.totalWeight || 0,
    };

    if (updatedItems[index].orderedMeters > 0) {
      const calculated = calculateItemTotals(updatedItems[index]);
      updatedItems[index] = { ...updatedItems[index], ...calculated };
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
    
    // Clear error for this item
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[`item_${index}`];
      return updated;
    });
  };

  const handleMetersChange = (index, meters) => {
    const updatedItems = [...formData.items];
    updatedItems[index].orderedMeters = parseFloat(meters) || 0;

    if (updatedItems[index].estimateId && updatedItems[index].orderedMeters > 0) {
      const calculated = calculateItemTotals(updatedItems[index]);
      updatedItems[index] = { ...updatedItems[index], ...calculated };
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
    
    // Update error state
    if (updatedItems[index].orderedMeters <= 0 && updatedItems[index].estimateId) {
      setErrors(prev => ({ ...prev, [`item_${index}`]: 'Meters must be greater than 0' }));
    } else {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[`item_${index}`];
        return updated;
      });
    }
  };

  // Memoized validation function - doesn't trigger re-renders
  const validateFormData = useCallback(() => {
    const newErrors = {};

    if (!formData.partyId) {
      newErrors.partyId = 'Please select a party';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item';
    } else {
      formData.items.forEach((item, index) => {
        if (!item.estimateId) {
          newErrors[`item_${index}`] = 'Please select a quality';
        } else if (item.orderedMeters <= 0) {
          newErrors[`item_${index}`] = 'Meters must be greater than 0';
        }
      });
    }

    return newErrors;
  }, [formData.partyId, formData.items]);

  // Check if form is valid without setting state
  const isFormValid = useMemo(() => {
    const validationErrors = validateFormData();
    return Object.keys(validationErrors).length === 0;
  }, [validateFormData]);

  // Validate before submission
  const validateAndSubmit = () => {
    const validationErrors = validateFormData();
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateAndSubmit()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);

    try {
      const challanData = {
        partyId: formData.partyId,
        issueDate: formData.issueDate,
        paymentTermsDays: formData.paymentTermsDays,
        items: formData.items.map(item => ({
          estimateId: item.estimateId,
          orderedMeters: item.orderedMeters,
        })),
        notes: formData.notes,
      };

      const response = await challanAPI.create(challanData);
      toast.success('Challan created successfully!');
      navigate(`/challans/${response.data.challan._id}`);
    } catch (error) {
      console.error('Error creating challan:', error);
      toast.error(error.response?.data?.message || 'Failed to create challan');
    } finally {
      setLoading(false);
    }
  };

  const getDueDate = () => {
    const issueDate = new Date(formData.issueDate);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + (formData.paymentTermsDays || 0));
    return dueDate;
  };

  // Prepare party options for Select component
  const partyOptions = useMemo(() => {
    return parties.map(party => ({
      value: party._id,
      label: party.partyName,
      description: party.contactPerson ? `Contact: ${party.contactPerson}` : 'No contact',
      icon: '🏢',
      color: party.currentOutstanding > party.creditLimit * 0.8 ? '#ef4444' : '#10b981',
    }));
  }, [parties]);

  // Prepare estimate options for Select component
  const getEstimateOptions = useCallback((currentEstimateId = '') => {
    return estimates.map(estimate => ({
      value: estimate._id,
      label: estimate.qualityName,
      description: `Panna: ${estimate.weft?.panna} • ${formatCurrency(estimate.totalCost)}/m`,
      icon: '📦',
      disabled: formData.items.some(item => 
        item.estimateId === estimate._id && item.estimateId !== currentEstimateId
      ),
    }));
  }, [estimates, formData.items]);

  const steps = [
    { number: 1, title: 'Party Details', icon: User },
    { number: 2, title: 'Add Items', icon: Package },
    { number: 3, title: 'Review & Submit', icon: CheckCircle },
  ];

  const canProceedToStep2 = formData.partyId && !errors.partyId;
  const canProceedToStep3 = formData.items.length > 0 && 
    !formData.items.some((item, index) => !item.estimateId || item.orderedMeters <= 0);

  const handleResetForm = () => {
    setFormData({
      partyId: '',
      issueDate: new Date().toISOString().split('T')[0],
      paymentTermsDays: 30,
      notes: '',
      items: [],
    });
    setErrors({});
    setExpandedItems({});
    setCurrentStep(1);
    setSelectedParty(null);
    toast.success('Form reset successfully');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/challans')}
            className="hover:bg-gray-100 mt-1"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">New Delivery Challan</h1>
              <Badge variant="info" icon={FileText}>
                Draft
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">Create a new delivery challan with quality items</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(formData.issueDate).toLocaleDateString('en-IN')}
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {formData.items.length} Items
              </span>
              {totals.subtotalAmount > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatCurrency(totals.subtotalAmount)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/challans')}
            icon={X}
          >
            Cancel
          </Button>
          <Button 
            icon={Save} 
            onClick={handleSubmit} 
            loading={loading}
            disabled={!isFormValid}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
          >
            Create Challan
          </Button>
        </div>
      </div>

      {/* Enhanced Progress Steps */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <button
                type="button"
                onClick={() => {
                  if (step.number === 1) setCurrentStep(1);
                  if (step.number === 2 && canProceedToStep2) setCurrentStep(2);
                  if (step.number === 3 && canProceedToStep2 && canProceedToStep3) setCurrentStep(3);
                }}
                disabled={
                  (step.number === 2 && !canProceedToStep2) ||
                  (step.number === 3 && (!canProceedToStep2 || !canProceedToStep3))
                }
                className={`
                  flex items-center gap-3 flex-1 p-4 rounded-xl transition-all
                  ${currentStep === step.number 
                    ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-300' 
                    : currentStep > step.number
                      ? 'bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300'
                      : 'bg-gray-50 border-2 border-gray-200'
                  }
                  ${(step.number === 2 && !canProceedToStep2) || (step.number === 3 && (!canProceedToStep2 || !canProceedToStep3))
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:shadow-md'
                  }
                `}
              >
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all
                  ${currentStep === step.number 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : currentStep > step.number
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-gray-300 text-gray-600'
                  }
                `}>
                  {currentStep > step.number ? <CheckCircle className="w-6 h-6" /> : step.number}
                </div>
                <div className="text-left flex-1">
                  <p className={`font-semibold ${
                    currentStep === step.number ? 'text-indigo-900' :
                    currentStep > step.number ? 'text-green-900' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {currentStep > step.number ? 'Completed' : 
                     currentStep === step.number ? 'In Progress' : `Step ${step.number}`}
                  </p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 mx-2 rounded-full transition-all ${
                  currentStep > step.number ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Party Details */}
          {currentStep === 1 && (
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl">
                  <User className="w-6 h-6 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Party & Date Details</h3>
                  <p className="text-sm text-gray-500">Select party and configure challan dates</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Party Selection with Custom Select */}
                <Select
                  label="Select Party"
                  name="partyId"
                  value={formData.partyId}
                  onChange={(e) => {
                    setFormData({ ...formData, partyId: e.target.value });
                    setErrors(prev => {
                      const updated = { ...prev };
                      delete updated.partyId;
                      return updated;
                    });
                  }}
                  options={partyOptions}
                  placeholder="Choose a party..."
                  searchable
                  required
                  error={errors.partyId}
                  icon={Building2}
                  size="md"
                />

                {/* Party Details Card */}
                {selectedParty && (
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-bold text-blue-900">Party Information</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-xs text-blue-600 font-medium">Payment Terms</p>
                        </div>
                        <p className="font-bold text-blue-900">{selectedParty.paymentTermsDays} days</p>
                      </div>
                      <div className="bg-white/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Percent className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-xs text-blue-600 font-medium">Interest Rate</p>
                        </div>
                        <p className="font-bold text-blue-900">{selectedParty.interestPercentPerDay}% / day</p>
                      </div>
                      <div className="bg-white/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-xs text-blue-600 font-medium">Credit Limit</p>
                        </div>
                        <p className="font-bold text-blue-900">{formatCurrency(selectedParty.creditLimit)}</p>
                      </div>
                      <div className="bg-white/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-xs text-blue-600 font-medium">Outstanding</p>
                        </div>
                        <p className={`font-bold ${
                          selectedParty.currentOutstanding > selectedParty.creditLimit * 0.8 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {formatCurrency(selectedParty.currentOutstanding)}
                        </p>
                      </div>
                    </div>

                    {/* Contact Information */}
                    {(selectedParty.contactPerson || selectedParty.phone) && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {selectedParty.contactPerson && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-900">{selectedParty.contactPerson}</span>
                            </div>
                          )}
                          {selectedParty.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-900">{selectedParty.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Date Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Issue Date"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    required
                    icon={Calendar}
                  />

                  <Input
                    label="Payment Terms (Days)"
                    type="number"
                    value={formData.paymentTermsDays}
                    onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                    icon={TrendingUp}
                  />
                </div>

                {/* Due Date Display */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900">Due Date:</span>
                    </div>
                    <span className="text-lg font-bold text-purple-900">
                      {getDueDate().toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 mt-2">
                    Payment due in {formData.paymentTermsDays} days from issue date
                  </p>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/challans')}
                    icon={ArrowLeft}
                  >
                    Back to List
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceedToStep2}
                    icon={ArrowRight}
                  >
                    Next: Add Items
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Add Items */}
          {currentStep === 2 && (
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                    <Package className="w-6 h-6 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Challan Items</h3>
                    <p className="text-sm text-gray-500">
                      Add quality items • {formData.items.length} item{formData.items.length !== 1 ? 's' : ''} added
                    </p>
                  </div>
                </div>
                <Button 
                  icon={Plus} 
                  size="sm" 
                  onClick={addItem}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  Add Item
                </Button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="mb-4">
                    <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium mb-2">No items added yet</p>
                    <p className="text-sm text-gray-400 mb-6">Start by adding your first quality item to the challan</p>
                  </div>
                  <Button 
                    icon={Plus} 
                    onClick={addItem}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => {
                    const isExpanded = expandedItems[item.id];
                    const hasError = errors[`item_${index}`];
                    
                    return (
                      <div
                        key={item.id}
                        className={`
                          relative rounded-xl border-2 transition-all
                          ${hasError 
                            ? 'border-red-300 bg-red-50' 
                            : item.estimateId 
                              ? 'border-green-200 bg-gradient-to-br from-green-50 to-white' 
                              : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white'
                          }
                          hover:shadow-md
                        `}
                      >
                        {/* Item Header - Always Visible */}
                        <div 
                          className="p-5 cursor-pointer"
                          onClick={() => toggleItemExpanded(item.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              {/* Item Number */}
                              <div className={`
                                w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
                                ${item.estimateId 
                                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg' 
                                  : 'bg-gray-200 text-gray-600'
                                }
                              `}>
                                {index + 1}
                              </div>

                              {/* Item Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-gray-900 text-lg">
                                    {item.qualityName || 'Select Quality'}
                                  </h4>
                                  {item.estimateId && (
                                    <Badge variant="success" size="sm" icon={CheckCircle}>
                                      Configured
                                    </Badge>
                                  )}
                                </div>
                                {item.estimateId && item.orderedMeters > 0 ? (
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600">
                                      <Ruler className="w-4 h-4 inline mr-1" />
                                      {item.orderedMeters.toFixed(2)} m
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600">
                                      <Scale className="w-4 h-4 inline mr-1" />
                                      {item.calculatedWeight.toFixed(2)} Kg
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="font-semibold text-green-600">
                                      {formatCurrency(item.calculatedAmount)}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">Click to configure item details</p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemExpanded(item.id);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                {isExpanded ? (
                                  <EyeOff className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <Eye className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(index);
                                }}
                                className="text-red-600 hover:bg-red-50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Item Details */}
                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-4 border-t border-gray-200 pt-4 animate-fade-in">
                            {/* Quality Selection with Custom Select */}
                            <Select
                              label="Select Quality"
                              name={`estimate_${index}`}
                              value={item.estimateId}
                              onChange={(e) => handleEstimateSelect(index, e.target.value)}
                              options={getEstimateOptions(item.estimateId)}
                              placeholder="Choose a quality..."
                              searchable
                              required
                              error={hasError && !item.estimateId ? hasError : ''}
                              icon={Layers}
                            />

                            {/* Item Details - Only show if quality is selected */}
                            {item.estimateId && (
                              <>
                                {/* Quick Info Cards */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                                      <p className="text-xs text-blue-600 font-medium">Panna</p>
                                    </div>
                                    <p className="font-bold text-blue-900 text-lg">{item.panna}</p>
                                  </div>
                                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <DollarSign className="w-3.5 h-3.5 text-green-600" />
                                      <p className="text-xs text-green-600 font-medium">Price/Meter</p>
                                    </div>
                                    <p className="font-bold text-green-900 text-lg">{formatCurrency(item.pricePerMeter)}</p>
                                  </div>
                                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Scale className="w-3.5 h-3.5 text-purple-600" />
                                      <p className="text-xs text-purple-600 font-medium">Weight/Meter</p>
                                    </div>
                                    <p className="font-bold text-purple-900 text-lg">{item.weightPerMeter.toFixed(4)} Kg</p>
                                  </div>
                                </div>

                                {/* Meters Input */}
                                <Input
                                  label="Ordered Meters"
                                  type="number"
                                  step="0.01"
                                  value={item.orderedMeters || ''}
                                  onChange={(e) => handleMetersChange(index, e.target.value)}
                                  min="0"
                                  required
                                  placeholder="Enter meters (e.g., 100.50)"
                                  icon={Ruler}
                                  error={hasError && item.orderedMeters <= 0 ? hasError : ''}
                                />

                                {/* Calculated Results */}
                                {item.orderedMeters > 0 && (
                                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border-2 border-indigo-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Scale className="w-5 h-5 text-indigo-600" />
                                        <p className="text-sm text-indigo-600 font-semibold">Total Weight</p>
                                      </div>
                                      <p className="text-2xl font-bold text-indigo-900">
                                        {item.calculatedWeight.toFixed(4)} Kg
                                      </p>
                                      <p className="text-xs text-indigo-600 mt-1">
                                        {item.orderedMeters.toFixed(2)} m × {item.weightPerMeter.toFixed(4)} Kg/m
                                      </p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-600 font-semibold">Total Amount</p>
                                      </div>
                                      <p className="text-2xl font-bold text-green-900">
                                        {formatCurrency(item.calculatedAmount)}
                                      </p>
                                      <p className="text-xs text-green-600 mt-1">
                                        {item.orderedMeters.toFixed(2)} m × {formatCurrency(item.pricePerMeter)}/m
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Error Message */}
                        {hasError && (
                          <div className="px-5 pb-3">
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-100 p-3 rounded-lg">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>{hasError}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Global Items Error */}
                  {errors.items && (
                    <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">{errors.items}</span>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 border-t border-gray-200">
                    <Button 
                      variant="secondary" 
                      onClick={() => setCurrentStep(1)}
                      icon={ArrowLeft}
                    >
                      Back to Party
                    </Button>
                    <Button 
                      onClick={() => setCurrentStep(3)}
                      disabled={!canProceedToStep3}
                    >
                      Next: Review
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Review & Submit</h3>
                  <p className="text-sm text-gray-500">Verify all details before creating the challan</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Party Summary */}
                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-blue-900">Party Information</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Party Name</p>
                      <p className="font-semibold text-blue-900">{selectedParty?.partyName}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Contact Person</p>
                      <p className="font-semibold text-blue-900">{selectedParty?.contactPerson || '-'}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Issue Date</p>
                      <p className="font-semibold text-blue-900">
                        {new Date(formData.issueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Due Date</p>
                      <p className="font-semibold text-blue-900">
                        {getDueDate().toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-green-900">Items Summary</h4>
                    </div>
                    <Badge variant="success">
                      {formData.items.length} Item{formData.items.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {formData.items.map((item, index) => (
                      <div 
                        key={index} 
                        className="p-4 bg-white rounded-xl border border-green-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 mb-2">{item.qualityName}</p>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>Panna: <strong>{item.panna}</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <Ruler className="w-3.5 h-3.5" />
                                  <span><strong>{item.orderedMeters.toFixed(2)}</strong> meters</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <Scale className="w-3.5 h-3.5" />
                                  <span><strong>{item.calculatedWeight.toFixed(2)}</strong> Kg</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span><strong>{formatCurrency(item.pricePerMeter)}</strong>/m</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Item Total</p>
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(item.calculatedAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {formData.notes && (
                  <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <h4 className="font-bold text-gray-900">Additional Notes</h4>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg">
                      {formData.notes}
                    </p>
                  </div>
                )}

                {/* Final Summary Totals */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 text-center">
                    <Ruler className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs text-blue-600 font-medium mb-1">Total Meters</p>
                    <p className="text-2xl font-bold text-blue-900">{totals.totalMeters.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 text-center">
                    <Scale className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-xs text-purple-600 font-medium mb-1">Total Weight</p>
                    <p className="text-2xl font-bold text-purple-900">{totals.totalWeight.toFixed(2)} Kg</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 text-center">
                    <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-xs text-green-600 font-medium mb-1">Grand Total</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(totals.subtotalAmount)}</p>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t-2 border-gray-200">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(2)}
                    icon={ArrowLeft}
                  >
                    Back to Items
                  </Button>
                  <Button 
                    icon={Save} 
                    onClick={handleSubmit}
                    loading={loading}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
                  >
                    Create Challan
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Notes Section - Available in all steps */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Additional Notes (Optional)</h3>
            </div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Add any special instructions, delivery notes, or additional information..."
            />
            <p className="text-xs text-gray-500 mt-2">
              These notes will appear on the printed challan
            </p>
          </Card>
        </div>

        {/* Right Column - Live Summary */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-6">
            <Card className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                  <Calculator className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Summary</h3>
                  <p className="text-sm text-gray-500">Real-time calculation</p>
                </div>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse"></div>
                    <AlertCircle className="absolute inset-0 m-auto w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium mb-2">No items added</p>
                  <p className="text-gray-400 text-xs">Add items to see live calculation</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Animated Progress Circle */}
                  <div className="relative w-36 h-36 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="68"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="68"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 68}`}
                        strokeDashoffset={`${2 * Math.PI * 68 * (1 - Math.min(formData.items.length / 10, 1))}`}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Package className="w-8 h-8 text-indigo-600 mb-2" />
                      <span className="text-3xl font-bold text-indigo-600">{formData.items.length}</span>
                      <span className="text-xs text-gray-500 font-medium">Item{formData.items.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Ruler className="w-5 h-5 text-blue-600" />
                          <p className="text-sm text-blue-600 font-semibold">Total Meters</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{totals.totalMeters.toFixed(2)} m</p>
                      <div className="mt-2 w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((totals.totalMeters / 1000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Scale className="w-5 h-5 text-green-600" />
                          <p className="text-sm text-green-600 font-semibold">Total Weight</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{totals.totalWeight.toFixed(2)} Kg</p>
                      <p className="text-xs text-green-600 mt-1">
                        Avg: {formData.items.length > 0 ? (totals.totalWeight / formData.items.length).toFixed(2) : 0} Kg/item
                      </p>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl text-white shadow-xl hover:shadow-2xl transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-6 h-6 text-indigo-200" />
                          <p className="text-sm text-indigo-100 font-semibold">Subtotal Amount</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold mb-2">
                        {formatCurrency(totals.subtotalAmount)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-indigo-200">
                        <span>Avg/item: {formatCurrency(formData.items.length > 0 ? totals.subtotalAmount / formData.items.length : 0)}</span>
                        <span>{formData.items.length} items</span>
                      </div>
                    </div>
                  </div>

                  {/* Credit Limit Warning */}
                  {selectedParty && (
                    <div className={`p-4 rounded-xl border-2 ${
                      (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                        ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
                        : 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300'
                    }`}>
                      <div className="flex items-start gap-2 mb-3">
                        <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`} />
                        <div className="flex-1">
                          <p className={`font-bold mb-2 ${
                            (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                              ? 'text-red-900'
                              : 'text-amber-900'
                          }`}>
                            Credit Status
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={
                                (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }>Credit Limit:</span>
                              <span className="font-bold">
                                {formatCurrency(selectedParty.creditLimit)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={
                                (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }>Current Outstanding:</span>
                              <span className="font-bold">
                                {formatCurrency(selectedParty.currentOutstanding)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={
                                (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }>This Challan:</span>
                              <span className="font-bold">
                                {formatCurrency(totals.subtotalAmount)}
                              </span>
                            </div>
                            <div className={`flex justify-between pt-2 border-t ${
                              (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                                ? 'border-red-300'
                                : 'border-amber-300'
                            }`}>
                              <span className={`font-bold ${
                                (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                                  ? 'text-red-900'
                                  : 'text-amber-900'
                              }`}>
                                After Challan:
                              </span>
                              <span className={`font-bold text-lg ${
                                (selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}>
                                {formatCurrency(selectedParty.currentOutstanding + totals.subtotalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Warning Message */}
                          {(selectedParty.currentOutstanding + totals.subtotalAmount) > selectedParty.creditLimit && (
                            <div className="mt-3 p-2 bg-red-200 rounded-lg">
                              <p className="text-xs text-red-800 font-medium">
                                ⚠️ Credit limit will be exceeded by {formatCurrency(
                                  (selectedParty.currentOutstanding + totals.subtotalAmount) - selectedParty.creditLimit
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interest Info */}
                  {selectedParty && selectedParty.interestPercentPerDay > 0 && (
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-purple-900 font-semibold mb-2">Interest Policy</p>
                          <div className="space-y-1 text-xs text-purple-700">
                            <p>• Rate: <strong>{selectedParty.interestPercentPerDay}%</strong> per day</p>
                            <p>• Type: <strong className="capitalize">{selectedParty.interestType}</strong> interest</p>
                            <p>• After: <strong>{formData.paymentTermsDays} days</strong> from issue</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="pt-4 border-t-2 border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-3">Quick Actions</p>
                    <div className="space-y-2">
                      <Button
                        fullWidth
                        variant="secondary"
                        size="sm"
                        icon={Eye}
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? 'Hide' : 'Show'} Preview
                      </Button>
                      <Button
                        fullWidth
                        variant="secondary"
                        size="sm"
                        icon={RefreshCw}
                        onClick={handleResetForm}
                      >
                        Reset Form
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChallan;