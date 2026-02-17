// frontend/src/pages/ChallanDetail.jsx (Fixed with Enhanced Items Section)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  TrendingUp,
  AlertCircle,
  DollarSign,
  CheckCircle,
  Clock,
  Edit2,
  Printer,
  Download,
  CreditCard,
  FileText,
  Building2,
  Receipt,
  Percent,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Ruler,
  Weight,
  Calculator,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { challanAPI } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import {
  formatCurrency,
  calculateLiveInterest,
  getDaysOverdue,
} from '../utils/challanCalculations';
import toast from 'react-hot-toast';

const ChallanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [liveInterest, setLiveInterest] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    items: true,
    payments: true,
    notes: true,
  });
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchChallan();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (challan) {
        const interest = calculateLiveInterest(challan);
        setLiveInterest(interest);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [challan]);

  const fetchChallan = async () => {
    try {
      setLoading(true);
      const response = await challanAPI.getOne(id);
      setChallan(response.data.challan);
      setLiveInterest(response.data.challan.currentInterest || 0);
    } catch (error) {
      console.error('Error fetching challan:', error);
      toast.error('Failed to load challan');
      navigate('/challans');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    try {
      await challanAPI.recordPayment(id, paymentData);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        reference: '',
        notes: '',
      });
      fetchChallan();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Paid') {
      setShowMarkPaidModal(true);
    } else {
      try {
        await challanAPI.updateStatus(id, newStatus);
        toast.success(`Status updated to ${newStatus}`);
        fetchChallan();
      } catch (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to update status');
      }
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      const totalPayable = challan.totals.subtotalAmount + liveInterest;
      const totalPaid = challan.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const remainingAmount = totalPayable - totalPaid;

      await challanAPI.recordPayment(id, {
        amount: remainingAmount,
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        reference: '',
        notes: 'Final payment - Marked as paid',
      });

      await challanAPI.updateStatus(id, 'Paid');
      
      toast.success('Challan marked as paid successfully');
      setShowMarkPaidModal(false);
      fetchChallan();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to mark as paid');
    }
  };

  const handleCopyChallanNumber = () => {
    navigator.clipboard.writeText(challan.challanNumber);
    toast.success('Challan number copied');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusConfig = (status) => {
    const configs = {
      Open: { variant: 'warning', icon: Clock, label: 'Open' },
      Paid: { variant: 'success', icon: CheckCircle, label: 'Paid' },
      Overdue: { variant: 'danger', icon: AlertCircle, label: 'Overdue' },
      Cancelled: { variant: 'default', icon: AlertCircle, label: 'Cancelled' },
    };
    return configs[status] || configs.Open;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!challan) return null;

  const statusConfig = getStatusConfig(challan.status);
  const daysOverdue = getDaysOverdue(challan.dueDate);
  const totalPayable = challan.totals.subtotalAmount + liveInterest;
  const totalPaid = challan.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remainingAmount = totalPayable - totalPaid;
  const paymentProgress = (totalPaid / totalPayable * 100).toFixed(1);

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/challans')}
            className="hover:bg-gray-100"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Challan {challan.challanNumber}
              </h1>
              <Badge variant={statusConfig.variant} icon={statusConfig.icon}>
                {statusConfig.label}
              </Badge>
              <button
                onClick={handleCopyChallanNumber}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy challan number"
              >
                <Copy className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-500 mt-1">Delivery challan details and tracking</p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button variant="ghost" icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="ghost" icon={Download}>
            Download
          </Button>
          {hasPermission('production:edit') && challan.status === 'Open' && (
            <Button 
              icon={CreditCard} 
              onClick={() => setShowPaymentModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center border-b-2 border-gray-300 pb-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DELIVERY CHALLAN</h1>
        <p className="text-xl font-semibold text-gray-700">#{challan.challanNumber}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600">Total Amount</p>
              <p className="text-xl font-bold text-blue-900 mt-1">
                {formatCurrency(challan.totals.subtotalAmount)}
              </p>
            </div>
            <div className="p-2 bg-blue-200 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600">Paid Amount</p>
              <p className="text-xl font-bold text-green-900 mt-1">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="p-2 bg-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600">Remaining</p>
              <p className="text-xl font-bold text-amber-900 mt-1">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
            <div className="p-2 bg-amber-200 rounded-lg">
              <TrendingUp className="w-4 h-4 text-amber-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600">Total Items</p>
              <p className="text-xl font-bold text-purple-900 mt-1">
                {challan.items?.length || 0}
              </p>
            </div>
            <div className="p-2 bg-purple-200 rounded-lg">
              <Package className="w-4 h-4 text-purple-700" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Party Information Card */}
          <Card className="print:shadow-none print:border-2 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Party Information</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={ExternalLink}
                onClick={() => navigate(`/parties/${challan.party?._id}`)}
                className="text-indigo-600"
              >
                View Party
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                  <p className="text-lg font-bold text-gray-900 mb-3">{challan.party?.partyName}</p>
                  <div className="space-y-2">
                    {challan.party?.contactPerson && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{challan.party.contactPerson}</span>
                      </div>
                    )}
                    {challan.party?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{challan.party.phone}</span>
                      </div>
                    )}
                    {challan.party?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{challan.party.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-blue-600 mb-1">Issue Date</p>
                    <p className="font-semibold text-blue-900">
                      {new Date(challan.issueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${
                    daysOverdue > 0 ? 'bg-red-50' : 'bg-green-50'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      daysOverdue > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>Due Date</p>
                    <p className={`font-semibold ${
                      daysOverdue > 0 ? 'text-red-900' : 'text-green-900'
                    }`}>
                      {new Date(challan.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {daysOverdue > 0 && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">
                        {daysOverdue} days overdue
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Enhanced Items Section */}
          <Card className="print:shadow-none print:border-2 hover:shadow-lg transition-shadow overflow-hidden">
            <div 
              className="flex items-center justify-between cursor-pointer p-6"
              onClick={() => toggleSection('items')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Items Details</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-500">
                      {challan.items?.length} item{challan.items?.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      Total {challan.totals?.totalMeters.toFixed(2)} meters
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      {challan.totals?.totalWeight.toFixed(2)} Kg
                    </span>
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                {expandedSections.items ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>

            {expandedSections.items && (
              <div className="border-t border-gray-200">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm w-12">
                          #
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm min-w-[180px]">
                          Quality Name
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-gray-700 text-sm w-24">
                          Panna
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm w-28">
                          <div className="flex items-center justify-end gap-1">
                            <Ruler className="w-4 h-4" />
                            Meters
                          </div>
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm w-32">
                          <div className="flex items-center justify-end gap-1">
                            <Weight className="w-4 h-4" />
                            Weight/m
                          </div>
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm w-32">
                          <div className="flex items-center justify-end gap-1">
                            <Weight className="w-4 h-4" />
                            Total Weight
                          </div>
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm w-32">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-4 h-4" />
                            Price/m
                          </div>
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm w-36">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-4 h-4" />
                            Amount
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {challan.items?.map((item, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all group"
                        >
                          <td className="py-4 px-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm group-hover:bg-indigo-200 transition-colors">
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                                <Package className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{item.qualityName}</p>
                                {item.qualityCode && (
                                  <p className="text-xs text-gray-500 font-mono">{item.qualityCode}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 rounded-lg text-sm font-semibold shadow-sm">
                              {item.panna}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-semibold text-gray-900">
                              {item.orderedMeters.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">meters</div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-medium text-gray-700">
                              {item.weightPerMeter.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">Kg/m</div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-semibold text-gray-900">
                              {item.calculatedWeight.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">Kg</div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-medium text-gray-700">
                              {formatCurrency(item.pricePerMeter)}
                            </div>
                            <div className="text-xs text-gray-500">per meter</div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex flex-col items-end px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg">
                              <span className="font-bold text-indigo-900 text-base">
                                {formatCurrency(item.calculatedAmount)}
                              </span>
                              <span className="text-xs text-indigo-600">
                                @ {formatCurrency(item.pricePerMeter)}/m
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-t-2 border-indigo-200">
                        <td colSpan="3" className="py-5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-200 rounded-lg">
                              <Calculator className="w-5 h-5 text-indigo-700" />
                            </div>
                            <span className="font-bold text-gray-900 text-lg">TOTALS</span>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-right">
                          <div className="font-bold text-indigo-900 text-lg">
                            {challan.totals?.totalMeters.toFixed(2)}
                          </div>
                          <div className="text-xs text-indigo-600 font-medium">Total Meters</div>
                        </td>
                        <td className="py-5 px-4"></td>
                        <td className="py-5 px-4 text-right">
                          <div className="font-bold text-indigo-900 text-lg">
                            {challan.totals?.totalWeight.toFixed(2)}
                          </div>
                          <div className="text-xs text-indigo-600 font-medium">Total Kg</div>
                        </td>
                        <td className="py-5 px-4"></td>
                        <td className="py-5 px-4 text-right">
                          <div className="inline-flex flex-col items-end px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-lg">
                            <span className="text-xs text-indigo-200 font-medium mb-1">Grand Total</span>
                            <span className="font-bold text-white text-2xl">
                              {formatCurrency(challan.totals?.subtotalAmount)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                  {challan.items?.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all"
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{item.qualityName}</p>
                            {item.qualityCode && (
                              <p className="text-xs text-gray-500 font-mono mt-1">{item.qualityCode}</p>
                            )}
                          </div>
                        </div>
                        <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 rounded-lg text-sm font-bold">
                          P-{item.panna}
                        </span>
                      </div>

                      {/* Item Details Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 rounded-xl">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Ruler className="w-3.5 h-3.5 text-blue-600" />
                            <p className="text-xs text-blue-600 font-medium">Meters</p>
                          </div>
                          <p className="font-bold text-blue-900 text-lg">{item.orderedMeters.toFixed(2)}</p>
                        </div>

                        <div className="p-3 bg-teal-50 rounded-xl">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Weight className="w-3.5 h-3.5 text-teal-600" />
                            <p className="text-xs text-teal-600 font-medium">Weight/m</p>
                          </div>
                          <p className="font-bold text-teal-900 text-lg">{item.weightPerMeter.toFixed(2)}</p>
                          <p className="text-xs text-teal-600">Kg/m</p>
                        </div>

                        <div className="p-3 bg-purple-50 rounded-xl">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Weight className="w-3.5 h-3.5 text-purple-600" />
                            <p className="text-xs text-purple-600 font-medium">Total Weight</p>
                          </div>
                          <p className="font-bold text-purple-900 text-lg">{item.calculatedWeight.toFixed(2)}</p>
                          <p className="text-xs text-purple-600">Kg</p>
                        </div>

                        <div className="p-3 bg-green-50 rounded-xl">
                          <div className="flex items-center gap-1.5 mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-green-600" />
                            <p className="text-xs text-green-600 font-medium">Price/m</p>
                          </div>
                          <p className="font-bold text-green-900 text-lg">{formatCurrency(item.pricePerMeter)}</p>
                        </div>
                      </div>

                      {/* Item Amount */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-200 text-sm font-medium">Item Total</span>
                          <div className="text-right">
                            <p className="text-white font-bold text-2xl">
                              {formatCurrency(item.calculatedAmount)}
                            </p>
                            <p className="text-indigo-200 text-xs">
                              {item.orderedMeters.toFixed(2)}m × {formatCurrency(item.pricePerMeter)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Mobile Total */}
                  <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-lg mt-6">
                    <p className="text-indigo-200 text-sm font-medium mb-4">Summary</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm">Total Meters:</span>
                        <span className="text-white font-bold text-lg">
                          {challan.totals?.totalMeters.toFixed(2)} m
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm">Total Weight:</span>
                        <span className="text-white font-bold text-lg">
                          {challan.totals?.totalWeight.toFixed(2)} Kg
                        </span>
                      </div>
                      <div className="pt-3 border-t border-indigo-400">
                        <div className="flex justify-between items-center">
                          <span className="text-indigo-200 font-medium">GRAND TOTAL:</span>
                          <span className="text-white font-bold text-2xl">
                            {formatCurrency(challan.totals?.subtotalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Payment History */}
          {challan.payments && challan.payments.length > 0 && (
            <Card className="print:hidden hover:shadow-lg transition-shadow">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('payments')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Receipt className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                    <p className="text-sm text-gray-500">
                      {challan.payments.length} payments • Total {formatCurrency(totalPaid)}
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  {expandedSections.payments ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {expandedSections.payments && (
                <div className="mt-6 space-y-3">
                  {challan.payments.map((payment, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-gradient-to-r from-green-50 to-white rounded-xl border border-green-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-green-900">
                              {formatCurrency(payment.amount)}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-700">
                                {new Date(payment.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-green-400">•</span>
                              <span className="text-green-700">{payment.method}</span>
                            </div>
                          </div>
                        </div>
                        {payment.reference && (
                          <Badge variant="success" size="sm">
                            Ref: {payment.reference}
                          </Badge>
                        )}
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-green-700 mt-3 pl-11 bg-green-100/50 p-2 rounded-lg">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Notes */}
          {challan.notes && (
            <Card className="print:shadow-none print:border-2 hover:shadow-lg transition-shadow">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('notes')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  {expandedSections.notes ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {expandedSections.notes && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-700 whitespace-pre-wrap">{challan.notes}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column - Financial Summary */}
        <div className="space-y-6">
          {/* Financial Summary Card */}
          <div className="lg:sticky lg:top-6 space-y-6">
            <Card className="print:static print:shadow-none print:border-2 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                  <p className="text-sm text-gray-500">Payment breakdown</p>
                </div>
              </div>

              {/* Payment Progress */}
              {totalPaid > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Payment Progress</span>
                    <span className="font-semibold text-gray-900">{paymentProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${paymentProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Subtotal */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-blue-600 font-medium">Subtotal Amount</p>
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(challan.totals?.subtotalAmount)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Principal amount</p>
                </div>

                {/* Interest */}
                {liveInterest > 0 && (
                  <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 animate-pulse-slow">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-red-600 font-medium">Interest Accrued</p>
                      <Percent className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-red-900">
                        +{formatCurrency(liveInterest)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-red-500 bg-red-200/50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 animate-spin-slow" />
                        <span>Live</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-red-200 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-red-600">Rate</p>
                        <p className="font-medium text-red-900">{challan.interestTracking?.interestRate}%/day</p>
                      </div>
                      <div>
                        <p className="text-red-600">Type</p>
                        <p className="font-medium text-red-900 capitalize">{challan.interestTracking?.interestType}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Payable */}
                <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-indigo-100">Total Payable</p>
                    <TrendingUp className="w-4 h-4 text-indigo-200" />
                  </div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(totalPayable)}
                  </p>
                  {liveInterest > 0 && (
                    <p className="text-xs text-indigo-200 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Includes interest charges
                    </p>
                  )}
                </div>

                {/* Payments & Remaining */}
                {totalPaid > 0 && (
                  <>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-green-600 font-medium">Total Paid</p>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(totalPaid)}
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-amber-600 font-medium">Remaining Amount</p>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      </div>
                      <p className="text-2xl font-bold text-amber-900">
                        {formatCurrency(remainingAmount)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Signature Block - Print Only */}
              <div className="hidden print:block mt-12 pt-6 border-t-2 border-gray-300">
                <div className="grid grid-cols-2 gap-8 mt-8">
                  <div>
                    <div className="border-t border-gray-400 pt-2">
                      <p className="text-sm font-semibold">Receiver's Signature</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-gray-400 pt-2">
                      <p className="text-sm font-semibold">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions - Separate Card */}
            {hasPermission('production:edit') && challan.status !== 'Paid' && (
              <Card className="print:hidden bg-gradient-to-br from-gray-50 to-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {challan.status === 'Open' && (
                    <>
                      <Button
                        fullWidth
                        variant="success"
                        icon={CheckCircle}
                        onClick={() => handleStatusChange('Paid')}
                        className="justify-center"
                      >
                        Mark as Paid
                      </Button>
                      {daysOverdue > 0 && (
                        <Button
                          fullWidth
                          variant="danger"
                          icon={AlertCircle}
                          onClick={() => handleStatusChange('Overdue')}
                          className="justify-center"
                        >
                          Mark as Overdue
                        </Button>
                      )}
                    </>
                  )}
                  {challan.status === 'Overdue' && (
                    <Button
                      fullWidth
                      variant="success"
                      icon={CheckCircle}
                      onClick={() => handleStatusChange('Paid')}
                      className="justify-center"
                    >
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        size="lg"
      >
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Payment Amount *"
              type="number"
              step="0.01"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              required
              placeholder="Enter amount"
              icon={DollarSign}
            />

            <Input
              label="Payment Date *"
              type="date"
              value={paymentData.date}
              onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
              required
              icon={Calendar}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Payment Method *
            </label>
            <select
              value={paymentData.method}
              onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            >
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <Input
            label="Reference Number"
            value={paymentData.reference}
            onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
            placeholder="Transaction/Cheque number"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Additional notes..."
            />
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-blue-700">Total Payable:</span>
              <span className="font-bold text-blue-900">{formatCurrency(totalPayable)}</span>
            </div>
            {totalPaid > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-blue-700">Already Paid:</span>
                <span className="font-semibold text-blue-900">{formatCurrency(totalPaid)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
              <span className="text-blue-700">Remaining:</span>
              <span className="font-bold text-blue-900">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" icon={CheckCircle}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mark as Paid Confirmation Modal */}
      <Modal
        isOpen={showMarkPaidModal}
        onClose={() => setShowMarkPaidModal(false)}
        title="Mark Challan as Paid"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  This will automatically record the remaining payment and mark the challan as paid.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Payable:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalPayable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Already Paid:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
              <span className="text-gray-900 font-medium">Payment to be recorded:</span>
              <span className="font-bold text-green-600">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowMarkPaidModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="success" 
              icon={CheckCircle}
              onClick={handleMarkAsPaid}
            >
              Confirm & Mark as Paid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChallanDetail;