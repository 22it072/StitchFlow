// frontend/src/pages/NewChallan.jsx (Fixed - Select Dropdown Overflow)
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
  ChevronDown,
  ChevronUp,
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
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [stepDirection, setStepDirection] = useState('forward');
  // Track which item's select is currently open
  const [activeSelectItem, setActiveSelectItem] = useState(null);

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

  useEffect(() => {
    fetchParties();
    fetchEstimates();
  }, []);

  useEffect(() => {
    if (formData.partyId) {
      const party = parties.find((p) => p._id === formData.partyId);
      setSelectedParty(party);
      if (party && party.paymentTermsDays !== formData.paymentTermsDays) {
        setFormData((prev) => ({
          ...prev,
          paymentTermsDays: party.paymentTermsDays || 30,
        }));
      }
    } else {
      setSelectedParty(null);
    }
  }, [formData.partyId, parties]);

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
    setFormData((prev) => ({
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
    setExpandedItems((prev) => ({ ...prev, [newItemId]: true }));
  };

  const removeItem = (index) => {
    const itemId = formData.items[index].id;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setExpandedItems((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`item_${index}`];
      return updated;
    });
  };

  const toggleItemExpanded = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleEstimateSelect = (index, estimateId) => {
    const estimate = estimates.find((e) => e._id === estimateId);
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

    setFormData((prev) => ({ ...prev, items: updatedItems }));
    setActiveSelectItem(null);

    setErrors((prev) => {
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

    setFormData((prev) => ({ ...prev, items: updatedItems }));

    if (updatedItems[index].orderedMeters <= 0 && updatedItems[index].estimateId) {
      setErrors((prev) => ({
        ...prev,
        [`item_${index}`]: 'Meters must be greater than 0',
      }));
    } else {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[`item_${index}`];
        return updated;
      });
    }
  };

  const validateFormData = useCallback(() => {
    const newErrors = {};
    if (!formData.partyId) newErrors.partyId = 'Please select a party';
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item';
    } else {
      formData.items.forEach((item, index) => {
        if (!item.estimateId) newErrors[`item_${index}`] = 'Please select a quality';
        else if (item.orderedMeters <= 0) newErrors[`item_${index}`] = 'Meters must be greater than 0';
      });
    }
    return newErrors;
  }, [formData.partyId, formData.items]);

  const isFormValid = useMemo(() => {
    return Object.keys(validateFormData()).length === 0;
  }, [validateFormData]);

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
        dueDate: getDueDate().toISOString(),
        paymentTermsDays: formData.paymentTermsDays,
        items: formData.items.map((item) => ({
          estimateId: item.estimateId,
          orderedMeters: item.orderedMeters,
          qualityName: item.qualityName,
          panna: item.panna,
          pricePerMeter: item.pricePerMeter,
          weightPerMeter: item.weightPerMeter,
          calculatedWeight: item.calculatedWeight,
          calculatedAmount: item.calculatedAmount,
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

  const partyOptions = useMemo(() => {
    return parties.map((party) => ({
      value: party._id,
      label: party.partyName,
      description: party.contactPerson ? `Contact: ${party.contactPerson}` : 'No contact',
      icon: '🏢',
      color: party.currentOutstanding > party.creditLimit * 0.8 ? '#ef4444' : '#10b981',
    }));
  }, [parties]);

  const getEstimateOptions = useCallback(
    (currentEstimateId = '') => {
      return estimates.map((estimate) => ({
        value: estimate._id,
        label: estimate.qualityName,
        description: `Panna: ${estimate.weft?.panna} • ${formatCurrency(estimate.totalCost)}/m`,
        icon: '📦',
        disabled: formData.items.some(
          (item) => item.estimateId === estimate._id && item.estimateId !== currentEstimateId
        ),
      }));
    },
    [estimates, formData.items]
  );

  const steps = [
    { number: 1, title: 'Party Details', shortTitle: 'Party', icon: User },
    { number: 2, title: 'Add Items', shortTitle: 'Items', icon: Package },
    { number: 3, title: 'Review & Submit', shortTitle: 'Review', icon: CheckCircle },
  ];

  const canProceedToStep2 = formData.partyId && !errors.partyId;
  const canProceedToStep3 =
    formData.items.length > 0 &&
    !formData.items.some((item) => !item.estimateId || item.orderedMeters <= 0);

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
    setActiveSelectItem(null);
    toast.success('Form reset successfully');
  };

  const goToStep = (step) => {
    setStepDirection(step > currentStep ? 'forward' : 'backward');
    setCurrentStep(step);
  };

  const creditUsagePercent = useMemo(() => {
    if (!selectedParty || !selectedParty.creditLimit) return 0;
    return Math.min(
      ((selectedParty.currentOutstanding + totals.subtotalAmount) / selectedParty.creditLimit) * 100,
      100
    );
  }, [selectedParty, totals.subtotalAmount]);

  const currentCreditPercent = useMemo(() => {
    if (!selectedParty || !selectedParty.creditLimit) return 0;
    return Math.min((selectedParty.currentOutstanding / selectedParty.creditLimit) * 100, 100);
  }, [selectedParty]);

  return (
    <div className="min-h-screen pb-32 sm:pb-8">
      <div className="space-y-4 sm:space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/challans')}
              className="mt-1 p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  New Delivery Challan
                </h1>
                <Badge variant="info" icon={FileText}>Draft</Badge>
              </div>
              <p className="text-gray-500 mt-0.5 text-sm hidden sm:block">
                Create a new delivery challan with quality items
              </p>
              <div className="flex items-center gap-3 sm:gap-4 mt-1.5 text-xs sm:text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(formData.issueDate).toLocaleDateString('en-IN')}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {formData.items.length} Items
                </span>
                {totals.subtotalAmount > 0 && (
                  <span className="flex items-center gap-1 font-medium text-green-600">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatCurrency(totals.subtotalAmount)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex gap-3 flex-shrink-0">
            <Button variant="ghost" onClick={() => navigate('/challans')} icon={X}>Cancel</Button>
            <Button
              icon={Save}
              onClick={handleSubmit}
              loading={loading}
              disabled={!isFormValid}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.97] transition-all duration-150"
            >
              Create Challan
            </Button>
          </div>
        </div>

        {/* ─── Progress Steps ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
          {/* Desktop horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <button
                  type="button"
                  onClick={() => {
                    if (step.number === 1) goToStep(1);
                    if (step.number === 2 && canProceedToStep2) goToStep(2);
                    if (step.number === 3 && canProceedToStep2 && canProceedToStep3) goToStep(3);
                  }}
                  disabled={
                    (step.number === 2 && !canProceedToStep2) ||
                    (step.number === 3 && (!canProceedToStep2 || !canProceedToStep3))
                  }
                  className={`flex items-center gap-3 flex-1 p-3 lg:p-4 rounded-xl transition-all duration-300
                    ${currentStep === step.number
                      ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/80 border-2 border-indigo-300 shadow-sm'
                      : currentStep > step.number
                        ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/80 border-2 border-emerald-300'
                        : 'bg-gray-50 border-2 border-gray-200'}
                    ${(step.number === 2 && !canProceedToStep2) || (step.number === 3 && (!canProceedToStep2 || !canProceedToStep3))
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-pointer hover:shadow-md active:scale-[0.98]'}
                  `}
                >
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center font-bold text-sm lg:text-lg transition-all duration-300
                    ${currentStep === step.number
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : currentStep > step.number
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-gray-300 text-gray-600'}
                  `}>
                    {currentStep > step.number ? <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" /> : step.number}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className={`font-semibold text-sm lg:text-base truncate ${
                      currentStep === step.number ? 'text-indigo-900'
                        : currentStep > step.number ? 'text-emerald-900' : 'text-gray-500'
                    }`}>{step.title}</p>
                    <p className="text-[10px] lg:text-xs text-gray-400">
                      {currentStep > step.number ? '✓ Completed' : currentStep === step.number ? 'In Progress' : `Step ${step.number}`}
                    </p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className="w-6 lg:w-10 mx-1 lg:mx-2 flex items-center">
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: currentStep > step.number ? '100%' : currentStep === step.number ? '50%' : '0%',
                          background: currentStep > step.number
                            ? 'linear-gradient(to right, #34d399, #10b981)'
                            : 'linear-gradient(to right, #818cf8, #a5b4fc)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile compact */}
          <div className="flex sm:hidden items-center justify-between gap-1">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <button
                  type="button"
                  onClick={() => {
                    if (step.number === 1) goToStep(1);
                    if (step.number === 2 && canProceedToStep2) goToStep(2);
                    if (step.number === 3 && canProceedToStep2 && canProceedToStep3) goToStep(3);
                  }}
                  disabled={
                    (step.number === 2 && !canProceedToStep2) ||
                    (step.number === 3 && (!canProceedToStep2 || !canProceedToStep3))
                  }
                  className={`flex flex-col items-center gap-1.5 flex-1 py-2.5 px-2 rounded-xl transition-all duration-300 min-h-[44px]
                    ${currentStep === step.number ? 'bg-indigo-50 border-2 border-indigo-300'
                      : currentStep > step.number ? 'bg-emerald-50 border-2 border-emerald-200'
                        : 'bg-gray-50 border-2 border-transparent'}
                    ${(step.number === 2 && !canProceedToStep2) || (step.number === 3 && (!canProceedToStep2 || !canProceedToStep3))
                      ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}
                  `}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300
                    ${currentStep === step.number ? 'bg-indigo-600 text-white shadow-md'
                      : currentStep > step.number ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    {currentStep > step.number ? <CheckCircle className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-semibold leading-tight ${
                    currentStep === step.number ? 'text-indigo-700'
                      : currentStep > step.number ? 'text-emerald-700' : 'text-gray-400'
                  }`}>{step.shortTitle}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className="w-5 flex items-center -mt-4">
                    <div className="w-full h-0.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: currentStep > step.number ? '100%' : currentStep === step.number ? '50%' : '0%',
                          background: currentStep > step.number
                            ? 'linear-gradient(to right, #34d399, #10b981)'
                            : 'linear-gradient(to right, #818cf8, #a5b4fc)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ─── Main Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">

            {/* ════════════ Step 1: Party Details ════════════ */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-5 sm:mb-6">
                  <div className="p-2.5 sm:p-3 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-700" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Party & Date Details</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Select party and configure challan dates</p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <Select
                    label="Select Party"
                    name="partyId"
                    value={formData.partyId}
                    onChange={(e) => {
                      setFormData({ ...formData, partyId: e.target.value });
                      setErrors((prev) => { const u = { ...prev }; delete u.partyId; return u; });
                    }}
                    options={partyOptions}
                    placeholder="Choose a party..."
                    searchable
                    required
                    error={errors.partyId}
                    icon={Building2}
                    size="md"
                  />

                  {selectedParty && (
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/60 rounded-2xl border border-blue-200 transition-all duration-500 ease-out">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        <h4 className="text-sm font-bold text-blue-900">Party Information</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-white/70 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Payment Terms</p>
                          </div>
                          <p className="font-bold text-blue-900 text-sm sm:text-base">{selectedParty.paymentTermsDays} days</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Percent className="w-3 h-3 text-blue-500" />
                            <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Interest Rate</p>
                          </div>
                          <p className="font-bold text-blue-900 text-sm sm:text-base">{selectedParty.interestPercentPerDay}%/day</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                          <div className="flex items-center gap-1 mb-0.5">
                            <CreditCard className="w-3 h-3 text-blue-500" />
                            <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Credit Limit</p>
                          </div>
                          <p className="font-bold text-blue-900 text-sm sm:text-base">{formatCurrency(selectedParty.creditLimit)}</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                          <div className="flex items-center gap-1 mb-0.5">
                            <TrendingUp className="w-3 h-3 text-blue-500" />
                            <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Outstanding</p>
                          </div>
                          <p className={`font-bold text-sm sm:text-base ${
                            selectedParty.currentOutstanding > selectedParty.creditLimit * 0.8 ? 'text-red-600' : 'text-emerald-600'
                          }`}>{formatCurrency(selectedParty.currentOutstanding)}</p>
                        </div>
                      </div>
                      {(selectedParty.contactPerson || selectedParty.phone) && (
                        <div className="mt-3 sm:mt-4 pt-3 border-t border-blue-200/60">
                          <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                            {selectedParty.contactPerson && (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-blue-900 text-xs sm:text-sm">{selectedParty.contactPerson}</span>
                              </div>
                            )}
                            {selectedParty.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-blue-900 text-xs sm:text-sm">{selectedParty.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Input label="Issue Date" type="date" value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} required icon={Calendar} />
                    <Input label="Payment Terms (Days)" type="number" value={formData.paymentTermsDays}
                      onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 0 })}
                      min="0" required icon={TrendingUp} />
                  </div>

                  <div className="p-3.5 sm:p-4 bg-gradient-to-br from-purple-50/80 to-purple-100/60 rounded-2xl border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                        <span className="text-xs sm:text-sm font-semibold text-purple-900">Due Date:</span>
                      </div>
                      <span className="text-base sm:text-lg font-bold text-purple-900">
                        {getDueDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-purple-600 mt-1.5">
                      Payment due in {formData.paymentTermsDays} days from issue date
                    </p>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-gray-100">
                    <Button variant="ghost" onClick={() => navigate('/challans')} icon={ArrowLeft} className="min-h-[44px]">
                      <span className="hidden sm:inline">Back to List</span>
                      <span className="sm:hidden">Back</span>
                    </Button>
                    <Button onClick={() => goToStep(2)} disabled={!canProceedToStep2} icon={ArrowRight}
                      className="min-h-[44px] active:scale-[0.97] transition-transform">
                      <span className="hidden sm:inline">Next: Add Items</span>
                      <span className="sm:hidden">Next</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════ Step 2: Add Items (FIXED OVERFLOW) ════════════ */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Challan Items</h3>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {formData.items.length} item{formData.items.length !== 1 ? 's' : ''} added
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={addItem}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md active:scale-[0.96] transition-all duration-200 min-h-[44px]">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Item</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <div className="text-center py-12 sm:py-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium mb-1.5 text-sm sm:text-base">No items added yet</p>
                    <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-6 max-w-xs mx-auto">
                      Start by adding your first quality item to the challan
                    </p>
                    <button type="button" onClick={addItem}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl shadow-sm hover:shadow-md active:scale-[0.96] transition-all min-h-[44px]">
                      <Plus className="w-4 h-4" /> Add First Item
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {formData.items.map((item, index) => {
                      const isExpanded = expandedItems[item.id];
                      const hasError = errors[`item_${index}`];
                      const isSelectActive = activeSelectItem === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`
                            relative rounded-2xl border-2 transition-all duration-300
                            ${hasError
                              ? 'border-red-200 bg-red-50/50'
                              : item.estimateId
                                ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 to-white'
                                : 'border-gray-200 bg-gradient-to-br from-gray-50/50 to-white'}
                            hover:shadow-md
                          `}
                          /* KEY FIX: No overflow-hidden on the outer wrapper */
                        >
                          {/* Item Header – Always Visible (clickable to toggle) */}
                          <button
                            type="button"
                            className="w-full p-3.5 sm:p-4 text-left min-h-[44px]"
                            onClick={() => toggleItemExpanded(item.id)}
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 transition-all duration-300
                                ${item.estimateId
                                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md'
                                  : 'bg-gray-200 text-gray-500'}
                              `}>
                                {index + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                    {item.qualityName || 'Select Quality'}
                                  </h4>
                                  {item.estimateId && item.orderedMeters > 0 && (
                                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      <CheckCircle className="w-3 h-3" /> Ready
                                    </span>
                                  )}
                                </div>
                                {item.estimateId && item.orderedMeters > 0 ? (
                                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Ruler className="w-3 h-3" />{item.orderedMeters.toFixed(2)}m
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="flex items-center gap-1">
                                      <Scale className="w-3 h-3" />{item.calculatedWeight.toFixed(2)}Kg
                                    </span>
                                    <span className="text-gray-300 hidden sm:inline">•</span>
                                    <span className="font-semibold text-emerald-600">
                                      {formatCurrency(item.calculatedAmount)}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">Tap to configure details</p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <div className={`p-1.5 rounded-lg transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                                  className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </button>

                          {/* 
                            ═══ FIXED EXPANDED CONTENT ═══
                            Instead of max-h + overflow-hidden animation,
                            we use conditional render + CSS opacity/transform animation.
                            This prevents the Select dropdown from being clipped.
                          */}
                          {isExpanded && (
                            <div
                              className="border-t border-gray-100"
                              style={{ animation: 'slideDown 0.3s ease-out' }}
                            >
                              <div className="px-3.5 sm:px-4 pb-4 pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                                {/* 
                                  Quality Select - wrapped in a relative container
                                  with high z-index so dropdown renders on top 
                                */}
                                <div
                                  className="relative"
                                  style={{ zIndex: isSelectActive ? 50 : 1 }}
                                  onFocus={() => setActiveSelectItem(item.id)}
                                  onBlur={(e) => {
                                    // Only clear if focus leaves this entire wrapper
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                      setActiveSelectItem(null);
                                    }
                                  }}
                                >
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
                                </div>

                                {item.estimateId && (
                                  <>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                      <div className="p-2.5 sm:p-3 bg-blue-50/80 rounded-xl border border-blue-100">
                                        <p className="text-[10px] sm:text-xs text-blue-500 font-medium mb-0.5">Panna</p>
                                        <p className="font-bold text-blue-900 text-sm sm:text-lg">{item.panna}</p>
                                      </div>
                                      <div className="p-2.5 sm:p-3 bg-emerald-50/80 rounded-xl border border-emerald-100">
                                        <p className="text-[10px] sm:text-xs text-emerald-500 font-medium mb-0.5">Price/m</p>
                                        <p className="font-bold text-emerald-900 text-sm sm:text-lg truncate">{formatCurrency(item.pricePerMeter)}</p>
                                      </div>
                                      <div className="p-2.5 sm:p-3 bg-purple-50/80 rounded-xl border border-purple-100">
                                        <p className="text-[10px] sm:text-xs text-purple-500 font-medium mb-0.5">Wt/m</p>
                                        <p className="font-bold text-purple-900 text-sm sm:text-lg">{item.weightPerMeter.toFixed(3)}</p>
                                      </div>
                                    </div>

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

                                    {item.orderedMeters > 0 && (
                                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                        <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/80 rounded-xl border border-indigo-200">
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                            <Scale className="w-4 h-4 text-indigo-500" />
                                            <p className="text-[10px] sm:text-xs text-indigo-600 font-semibold">Total Weight</p>
                                          </div>
                                          <p className="text-lg sm:text-2xl font-bold text-indigo-900">
                                            {item.calculatedWeight.toFixed(2)}
                                            <span className="text-xs sm:text-sm font-medium ml-1">Kg</span>
                                          </p>
                                          <p className="text-[10px] text-indigo-500 mt-0.5">
                                            {item.orderedMeters.toFixed(2)} × {item.weightPerMeter.toFixed(4)}
                                          </p>
                                        </div>
                                        <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/80 rounded-xl border border-emerald-200">
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                            <DollarSign className="w-4 h-4 text-emerald-500" />
                                            <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold">Total Amount</p>
                                          </div>
                                          <p className="text-lg sm:text-2xl font-bold text-emerald-900 truncate">
                                            {formatCurrency(item.calculatedAmount)}
                                          </p>
                                          <p className="text-[10px] text-emerald-500 mt-0.5">
                                            {item.orderedMeters.toFixed(2)} × {formatCurrency(item.pricePerMeter)}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Error Message when collapsed */}
                          {hasError && !isExpanded && (
                            <div className="px-3.5 sm:px-4 pb-3">
                              <div className="flex items-center gap-1.5 text-red-600 text-xs bg-red-100/80 p-2.5 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{hasError}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {errors.items && (
                      <div className="p-3.5 sm:p-4 bg-red-50 rounded-2xl border border-red-200">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="font-medium text-sm">{errors.items}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4 sm:pt-6 border-t border-gray-100">
                      <Button variant="secondary" onClick={() => goToStep(1)} icon={ArrowLeft} className="min-h-[44px]">
                        <span className="hidden sm:inline">Back to Party</span>
                        <span className="sm:hidden">Back</span>
                      </Button>
                      <Button onClick={() => goToStep(3)} disabled={!canProceedToStep3} icon={ArrowRight}
                        className="min-h-[44px] active:scale-[0.97] transition-transform">
                        <span className="hidden sm:inline">Next: Review</span>
                        <span className="sm:hidden">Review</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════ Step 3: Review & Submit ════════════ */}
            {currentStep === 3 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-5 sm:mb-6">
                  <div className="p-2.5 sm:p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Review & Submit</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Verify all details before creating</p>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  {/* Party Summary */}
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 to-blue-100/60 rounded-2xl border border-blue-200">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      <h4 className="font-bold text-blue-900 text-sm sm:text-base">Party Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
                      <div className="bg-white/60 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                        <p className="text-[10px] sm:text-xs text-blue-500 mb-0.5">Party Name</p>
                        <p className="font-semibold text-blue-900 text-xs sm:text-sm truncate">{selectedParty?.partyName}</p>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                        <p className="text-[10px] sm:text-xs text-blue-500 mb-0.5">Contact</p>
                        <p className="font-semibold text-blue-900 text-xs sm:text-sm truncate">{selectedParty?.contactPerson || '-'}</p>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                        <p className="text-[10px] sm:text-xs text-blue-500 mb-0.5">Issue Date</p>
                        <p className="font-semibold text-blue-900 text-xs sm:text-sm">
                          {new Date(formData.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl">
                        <p className="text-[10px] sm:text-xs text-blue-500 mb-0.5">Due Date</p>
                        <p className="font-semibold text-blue-900 text-xs sm:text-sm">
                          {getDueDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        <h4 className="font-bold text-emerald-900 text-sm sm:text-base">Items Summary</h4>
                      </div>
                      <Badge variant="success">
                        {formData.items.length} Item{formData.items.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2.5 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="p-3 sm:p-4 bg-white rounded-xl border border-emerald-200/60 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base truncate">{item.qualityName}</p>
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-3 text-xs sm:text-sm">
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <Layers className="w-3 h-3" />
                                    <span>Panna: <strong className="text-gray-700">{item.panna}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <Ruler className="w-3 h-3" />
                                    <span><strong className="text-gray-700">{item.orderedMeters.toFixed(2)}</strong>m</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <Scale className="w-3 h-3" />
                                    <span><strong className="text-gray-700">{item.calculatedWeight.toFixed(2)}</strong>Kg</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <DollarSign className="w-3 h-3" />
                                    <span><strong className="text-gray-700">{formatCurrency(item.pricePerMeter)}</strong>/m</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] text-gray-400 mb-0.5">Total</p>
                              <p className="text-base sm:text-xl font-bold text-emerald-600">{formatCurrency(item.calculatedAmount)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.notes && (
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/60 rounded-2xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base">Additional Notes</h4>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap bg-white p-2.5 sm:p-3 rounded-xl text-sm">{formData.notes}</p>
                    </div>
                  )}

                  {/* Final Summary Totals */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100/80 rounded-2xl border border-blue-200 text-center">
                      <Ruler className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-[10px] sm:text-xs text-blue-500 font-medium mb-0.5">Total Meters</p>
                      <p className="text-lg sm:text-2xl font-bold text-blue-900">{totals.totalMeters.toFixed(1)}</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100/80 rounded-2xl border border-purple-200 text-center">
                      <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-[10px] sm:text-xs text-purple-500 font-medium mb-0.5">Total Weight</p>
                      <p className="text-lg sm:text-2xl font-bold text-purple-900">
                        {totals.totalWeight.toFixed(1)}<span className="text-xs font-medium ml-0.5">Kg</span>
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/80 rounded-2xl border border-emerald-200 text-center">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-[10px] sm:text-xs text-emerald-500 font-medium mb-0.5">Grand Total</p>
                      <p className="text-lg sm:text-2xl font-bold text-emerald-900 truncate">{formatCurrency(totals.subtotalAmount)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 sm:pt-6 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => goToStep(2)} icon={ArrowLeft} className="min-h-[44px]">
                      <span className="hidden sm:inline">Back to Items</span>
                      <span className="sm:hidden">Back</span>
                    </Button>
                    <Button icon={Save} onClick={handleSubmit} loading={loading}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.97] transition-all min-h-[44px]">
                      Create Challan
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900">
                  Additional Notes <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3.5 sm:px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-sm sm:text-base min-h-[44px] resize-y"
                placeholder="Add any special instructions, delivery notes..."
              />
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5">These notes will appear on the printed challan</p>
            </div>
          </div>

          {/* ─── Right Column – Live Summary ─── */}
          <div className="space-y-4 sm:space-y-6 order-last">
            {/* Mobile: Collapsible Summary */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setShowMobileSummary(!showMobileSummary)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between min-h-[44px] active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Calculator className="w-5 h-5 text-purple-700" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-gray-900">Live Summary</h3>
                    <p className="text-xs text-gray-500">
                      {formData.items.length} items • {formatCurrency(totals.subtotalAmount)}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showMobileSummary ? 'rotate-180' : ''}`} />
              </button>
              {showMobileSummary && (
                <div className="mt-3" style={{ animation: 'slideDown 0.3s ease-out' }}>
                  <LiveSummaryContent
                    formData={formData} totals={totals} selectedParty={selectedParty}
                    creditUsagePercent={creditUsagePercent} currentCreditPercent={currentCreditPercent}
                    showPreview={showPreview} setShowPreview={setShowPreview} handleResetForm={handleResetForm}
                  />
                </div>
              )}
            </div>

            {/* Desktop: Sticky Sidebar */}
            <div className="hidden lg:block lg:sticky lg:top-6">
              <LiveSummaryContent
                formData={formData} totals={totals} selectedParty={selectedParty}
                creditUsagePercent={creditUsagePercent} currentCreditPercent={currentCreditPercent}
                showPreview={showPreview} setShowPreview={setShowPreview} handleResetForm={handleResetForm}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile Sticky Bottom Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <div className="bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-medium">Subtotal</p>
              <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(totals.subtotalAmount)}</p>
              <p className="text-[10px] text-gray-400">
                {formData.items.length} item{formData.items.length !== 1 ? 's' : ''} • {totals.totalMeters.toFixed(1)}m
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm min-h-[48px] shadow-lg transition-all duration-200
                ${isFormValid && !loading
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white active:scale-[0.96] hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
              `}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Create Challan'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Inline keyframes for slideDown animation ─── */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────
   Live Summary Content Component
   ────────────────────────────────────────── */
const LiveSummaryContent = ({
  formData, totals, selectedParty, creditUsagePercent, currentCreditPercent,
  showPreview, setShowPreview, handleResetForm,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 bg-gradient-to-br from-gray-50/50 to-white">
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <div className="p-2.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
          <Calculator className="w-5 h-5 text-purple-700" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">Live Summary</h3>
          <p className="text-xs text-gray-400">Real-time calculation</p>
        </div>
      </div>

      {formData.items.length === 0 ? (
        <div className="text-center py-10 sm:py-12">
          <div className="w-20 h-20 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1">No items added</p>
          <p className="text-gray-400 text-xs">Add items to see live calculation</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* Ring */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-100" />
              <circle cx="50%" cy="50%" r="45%" stroke="url(#summaryGradient)" strokeWidth="6" fill="none"
                strokeDasharray={`${2 * Math.PI * 0.45 * 128}`}
                strokeDashoffset={`${2 * Math.PI * 0.45 * 128 * (1 - Math.min(formData.items.length / 10, 1))}`}
                className="transition-all duration-1000 ease-out" strokeLinecap="round" />
              <defs>
                <linearGradient id="summaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Package className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 mb-1" />
              <span className="text-2xl sm:text-3xl font-bold text-indigo-600">{formData.items.length}</span>
              <span className="text-[10px] text-gray-400 font-medium">Item{formData.items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="p-3.5 bg-gradient-to-br from-blue-50/80 to-blue-100/60 rounded-2xl border border-blue-200/80 hover:shadow-sm transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Ruler className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-blue-600 font-semibold">Total Meters</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-blue-900">
                {totals.totalMeters.toFixed(2)} <span className="text-sm font-medium text-blue-500">m</span>
              </p>
              <div className="mt-2 w-full h-1.5 bg-blue-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((totals.totalMeters / 1000) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 rounded-2xl border border-emerald-200/80 hover:shadow-sm transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Scale className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-emerald-600 font-semibold">Total Weight</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                {totals.totalWeight.toFixed(2)} <span className="text-sm font-medium text-emerald-500">Kg</span>
              </p>
              <p className="text-[10px] text-emerald-500 mt-1">
                Avg: {formData.items.length > 0 ? (totals.totalWeight / formData.items.length).toFixed(2) : 0} Kg/item
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                <DollarSign className="w-5 h-5 text-indigo-200" />
                <p className="text-xs text-indigo-200 font-semibold">Subtotal Amount</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold mb-1.5 sm:mb-2 truncate">{formatCurrency(totals.subtotalAmount)}</p>
              <div className="flex items-center justify-between text-[10px] sm:text-xs text-indigo-300">
                <span>Avg: {formatCurrency(formData.items.length > 0 ? totals.subtotalAmount / formData.items.length : 0)}</span>
                <span>{formData.items.length} items</span>
              </div>
            </div>
          </div>

          {/* Credit Limit with Progress Bar */}
          {selectedParty && (
            <div className={`p-3.5 sm:p-4 rounded-2xl border ${
              creditUsagePercent > 100 ? 'bg-gradient-to-br from-red-50/80 to-red-100/60 border-red-200'
                : creditUsagePercent > 80 ? 'bg-gradient-to-br from-amber-50/80 to-amber-100/60 border-amber-200'
                  : 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 border-emerald-200'
            }`}>
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  creditUsagePercent > 100 ? 'text-red-500' : creditUsagePercent > 80 ? 'text-amber-500' : 'text-emerald-500'
                }`} />
                <p className={`font-bold text-sm ${
                  creditUsagePercent > 100 ? 'text-red-900' : creditUsagePercent > 80 ? 'text-amber-900' : 'text-emerald-900'
                }`}>Credit Status</p>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-gray-500">Usage</span>
                  <span className={`font-bold ${
                    creditUsagePercent > 100 ? 'text-red-600' : creditUsagePercent > 80 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{creditUsagePercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200/60 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-gray-400/50 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(currentCreditPercent, 100)}%` }} />
                  <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${
                    creditUsagePercent > 100 ? 'bg-gradient-to-r from-red-400 to-red-500'
                      : creditUsagePercent > 80 ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                        : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  }`} style={{ width: `${Math.min(creditUsagePercent, 100)}%`, opacity: 0.7 }} />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Credit Limit</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(selectedParty.creditLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(selectedParty.currentOutstanding)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">This Challan</span>
                  <span className="font-semibold text-indigo-600">+{formatCurrency(totals.subtotalAmount)}</span>
                </div>
                <div className={`flex justify-between pt-1.5 border-t ${creditUsagePercent > 100 ? 'border-red-200' : 'border-gray-200'}`}>
                  <span className="font-bold text-gray-700">After</span>
                  <span className={`font-bold ${creditUsagePercent > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(selectedParty.currentOutstanding + totals.subtotalAmount)}
                  </span>
                </div>
              </div>

              {creditUsagePercent > 100 && (
                <div className="mt-2.5 p-2 bg-red-200/80 rounded-xl">
                  <p className="text-[10px] text-red-800 font-medium">
                    ⚠️ Exceeds limit by {formatCurrency(selectedParty.currentOutstanding + totals.subtotalAmount - selectedParty.creditLimit)}
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedParty && selectedParty.interestPercentPerDay > 0 && (
            <div className="p-3.5 bg-gradient-to-br from-purple-50/80 to-purple-100/60 rounded-2xl border border-purple-200/80">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-purple-900 font-semibold mb-1.5">Interest Policy</p>
                  <div className="space-y-0.5 text-[10px] sm:text-xs text-purple-600">
                    <p>• Rate: <strong>{selectedParty.interestPercentPerDay}%</strong> per day</p>
                    <p>• Type: <strong className="capitalize">{selectedParty.interestType}</strong></p>
                    <p>• After: <strong>{formData.paymentTermsDays} days</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 sm:pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-medium mb-2.5 uppercase tracking-wider">Quick Actions</p>
            <div className="space-y-2">
              <button type="button" onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 transition-colors min-h-[44px]">
                <Eye className="w-4 h-4" /> {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button type="button" onClick={handleResetForm}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 transition-colors min-h-[44px]">
                <RefreshCw className="w-4 h-4" /> Reset Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewChallan;