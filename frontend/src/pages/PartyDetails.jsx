// frontend/src/pages/PartyDetails.jsx (Enhanced Version)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Percent,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Package,
  DollarSign,
  Edit2,
  PieChart,
  Activity,
  Eye,
  Filter,
  Search,
  BarChart3,
  ShoppingBag,
  Weight,
  Ruler,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import { partyAPI, challanAPI } from '../services/api';
import { formatCurrency, getDaysOverdue } from '../utils/challanCalculations';
import toast from 'react-hot-toast';

const PartyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [party, setParty] = useState(null);
  const [challans, setChallans] = useState([]);
  const [filteredChallans, setFilteredChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    fetchPartyData();
  }, [id]);

  useEffect(() => {
    if (party) {
      fetchChallans();
    }
  }, [party, dateRange]);

  useEffect(() => {
    filterAndSortChallans();
  }, [challans, statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    if (filteredChallans.length > 0) {
      calculateStats();
    }
  }, [filteredChallans]);

  const fetchPartyData = async () => {
    try {
      const companyId = localStorage.getItem("activeCompanyId");
      setLoading(true);
      const response = await partyAPI.getOne(id, companyId);
      setParty(response.data.party);
    } catch (error) {
      console.error('Error fetching party:', error);
      toast.error('Failed to load party details');
      navigate('/parties');
    } finally {
      setLoading(false);
    }
  };

  const fetchChallans = async () => {
    try {
      setRefreshing(true);
      const response = await challanAPI.getAll({ 
        partyId: id,
        limit: 100,
        days: dateRange
      });
      setChallans(response.data.challans);
    } catch (error) {
      console.error('Error fetching challans:', error);
      toast.error('Failed to load challans');
    } finally {
      setRefreshing(false);
    }
  };

  const filterAndSortChallans = () => {
    let filtered = [...challans];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.challanNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sorting
    switch (sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));
        break;
      case 'amount-desc':
        filtered.sort((a, b) => (b.totals?.subtotalAmount || 0) - (a.totals?.subtotalAmount || 0));
        break;
      case 'amount-asc':
        filtered.sort((a, b) => (a.totals?.subtotalAmount || 0) - (b.totals?.subtotalAmount || 0));
        break;
      default:
        break;
    }

    setFilteredChallans(filtered);
  };

  const calculateStats = () => {
    const totalChallans = filteredChallans.length;
    const paidChallans = filteredChallans.filter(c => c.status === 'Paid').length;
    const overdueChallans = filteredChallans.filter(c => c.status === 'Overdue').length;
    const openChallans = filteredChallans.filter(c => c.status === 'Open').length;
    
    const totalAmount = filteredChallans.reduce((sum, c) => sum + (c.totals?.subtotalAmount || 0), 0);
    const totalMeters = filteredChallans.reduce((sum, c) => sum + (c.totals?.totalMeters || 0), 0);
    const totalWeight = filteredChallans.reduce((sum, c) => sum + (c.totals?.totalWeight || 0), 0);
    const totalItems = filteredChallans.reduce((sum, c) => sum + (c.items?.length || 0), 0);
    
    const paidAmount = filteredChallans.reduce((sum, c) => {
      if (c.status === 'Paid') {
        const payments = c.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0;
        return sum + payments;
      }
      return sum;
    }, 0);
    
    const pendingAmount = filteredChallans.reduce((sum, c) => 
      c.status !== 'Paid' ? sum + (c.totals?.subtotalAmount || 0) : sum, 0
    );

    const totalInterest = filteredChallans.reduce((sum, c) => sum + (c.currentInterest || 0), 0);
    const averagePaymentDays = calculateAveragePaymentDays();

    setStats({
      totalChallans,
      paidChallans,
      overdueChallans,
      openChallans,
      totalAmount,
      totalMeters,
      totalWeight,
      totalItems,
      paidAmount,
      pendingAmount,
      totalInterest,
      averagePaymentDays,
      paymentRate: totalChallans ? (paidChallans / totalChallans * 100).toFixed(1) : 0,
      collectionRate: totalAmount ? (paidAmount / totalAmount * 100).toFixed(1) : 0,
      averageOrderValue: totalChallans ? (totalAmount / totalChallans) : 0,
    });
  };

  const calculateAveragePaymentDays = () => {
    const paidChallansWithDates = filteredChallans.filter(c => 
      c.status === 'Paid' && c.payments?.length > 0
    );
    
    if (!paidChallansWithDates.length) return 0;

    const totalDays = paidChallansWithDates.reduce((sum, challan) => {
      const lastPayment = challan.payments[challan.payments.length - 1];
      const paymentDate = new Date(lastPayment.date);
      const issueDate = new Date(challan.issueDate);
      const daysDiff = Math.ceil((paymentDate - issueDate) / (1000 * 60 * 60 * 24));
      return sum + daysDiff;
    }, 0);

    return (totalDays / paidChallansWithDates.length).toFixed(1);
  };

  const getStatusBadge = (status) => {
    const variants = {
      Open: { variant: 'warning', icon: Clock },
      Paid: { variant: 'success', icon: CheckCircle },
      Overdue: { variant: 'danger', icon: AlertCircle },
      Cancelled: { variant: 'default', icon: AlertCircle },
    };
    const { variant, icon: Icon } = variants[status] || variants.Open;
    
    return (
      <Badge variant={variant} icon={Icon} size="sm">
        {status}
      </Badge>
    );
  };

  const handleRefresh = async () => {
    await fetchChallans();
    toast.success('Data refreshed successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!party) return null;

  const creditUtilization = (party.currentOutstanding / party.creditLimit * 100).toFixed(1);
  const isNearCreditLimit = creditUtilization > 80;
  const isOverCreditLimit = party.currentOutstanding > party.creditLimit;
  const availableCredit = party.creditLimit - party.currentOutstanding;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/parties')}
            className="hover:bg-gray-100 mt-1"
          />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{party.partyName}</h1>
              <Badge variant={party.activeStatus ? 'success' : 'default'}>
                {party.activeStatus ? 'Active' : 'Inactive'}
              </Badge>
              {isOverCreditLimit && (
                <Badge variant="danger" icon={AlertCircle}>
                  Over Credit Limit
                </Badge>
              )}
            </div>
            <p className="text-gray-500 mt-1">Complete party analytics and transaction history</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(party.createdAt).toLocaleDateString('en-IN')}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {stats?.totalChallans || 0} Challans
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            icon={RefreshCw}
            onClick={handleRefresh}
            disabled={refreshing}
            className={refreshing ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
          <Button 
            variant="ghost" 
            icon={Download}
            onClick={() => window.print()}
          >
            Export
          </Button>
          <Button 
            icon={Edit2}
            onClick={() => navigate(`/parties/${id}/edit`)}
          >
            Edit Party
          </Button>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-blue-600 font-medium">Outstanding Amount</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {formatCurrency(party.currentOutstanding)}
              </p>
            </div>
            <div className="p-3 bg-blue-200 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-700" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-blue-600">Credit Utilization</span>
              <span className="font-semibold text-blue-900">{creditUtilization}%</span>
            </div>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverCreditLimit ? 'bg-red-500' : isNearCreditLimit ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(creditUtilization, 100)}%` }}
              />
            </div>
          </div>
          {isNearCreditLimit && (
            <div className={`mt-3 p-2 rounded-lg text-xs flex items-center gap-1.5
              ${isOverCreditLimit ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
              <AlertCircle className="w-3 h-3" />
              <span>
                {isOverCreditLimit 
                  ? `Exceeded by ${formatCurrency(Math.abs(availableCredit))}`
                  : `Only ${formatCurrency(availableCredit)} available`}
              </span>
            </div>
          )}
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-green-600 font-medium">Credit Limit</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {formatCurrency(party.creditLimit)}
              </p>
            </div>
            <div className="p-3 bg-green-200 rounded-xl">
              <CreditCard className="w-6 h-6 text-green-700" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-200/50 p-2 rounded-lg">
              <p className="text-green-600">Available</p>
              <p className="font-semibold text-green-900">
                {formatCurrency(Math.max(availableCredit, 0))}
              </p>
            </div>
            <div className="bg-green-200/50 p-2 rounded-lg">
              <p className="text-green-600">Used</p>
              <p className="font-semibold text-green-900">
                {formatCurrency(party.currentOutstanding)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-purple-600 font-medium">Payment Terms</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {party.paymentTermsDays} days
              </p>
            </div>
            <div className="p-3 bg-purple-200 rounded-xl">
              <Calendar className="w-6 h-6 text-purple-700" />
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between bg-purple-200/50 p-2 rounded-lg">
              <span className="text-purple-600">Avg. Payment</span>
              <span className="font-semibold text-purple-900">
                {stats?.averagePaymentDays || 0} days
              </span>
            </div>
            <div className="flex justify-between bg-purple-200/50 p-2 rounded-lg">
              <span className="text-purple-600">Payment Rate</span>
              <span className="font-semibold text-purple-900">
                {stats?.paymentRate || 0}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-amber-600 font-medium">Interest Rate</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {party.interestPercentPerDay}%
              </p>
            </div>
            <div className="p-3 bg-amber-200 rounded-xl">
              <Percent className="w-6 h-6 text-amber-700" />
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between bg-amber-200/50 p-2 rounded-lg">
              <span className="text-amber-600">Type</span>
              <span className="font-semibold text-amber-900 capitalize">
                {party.interestType}
              </span>
            </div>
            <div className="flex justify-between bg-amber-200/50 p-2 rounded-lg">
              <span className="text-amber-600">Total Interest</span>
              <span className="font-semibold text-amber-900">
                {formatCurrency(stats?.totalInterest || 0)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Business Analytics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-600">Total Value</p>
                <p className="text-xl font-bold text-indigo-900 mt-1">
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>
              <div className="p-2 bg-indigo-200 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600">Total Items</p>
                <p className="text-xl font-bold text-teal-900 mt-1">
                  {stats.totalItems}
                </p>
              </div>
              <div className="p-2 bg-teal-200 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-teal-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-pink-600">Total Meters</p>
                <p className="text-xl font-bold text-pink-900 mt-1">
                  {stats.totalMeters.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-pink-200 rounded-lg">
                <Ruler className="w-5 h-5 text-pink-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-cyan-600">Total Weight</p>
                <p className="text-xl font-bold text-cyan-900 mt-1">
                  {stats.totalWeight.toFixed(2)} Kg
                </p>
              </div>
              <div className="p-2 bg-cyan-200 rounded-lg">
                <Weight className="w-5 h-5 text-cyan-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600">Avg. Order</p>
                <p className="text-xl font-bold text-orange-900 mt-1">
                  {formatCurrency(stats.averageOrderValue)}
                </p>
              </div>
              <div className="p-2 bg-orange-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-700" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Party Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Information */}
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            </div>

            <div className="space-y-3">
              {party.contactPerson && (
                <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Contact Person</p>
                    <p className="font-medium text-gray-900">{party.contactPerson}</p>
                  </div>
                </div>
              )}

              {party.phone && (
                <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <a 
                      href={`tel:${party.phone}`}
                      className="font-medium text-gray-900 hover:text-green-600 transition-colors"
                    >
                      {party.phone}
                    </a>
                  </div>
                </div>
              )}

              {party.email && (
                <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <a 
                      href={`mailto:${party.email}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors break-all"
                    >
                      {party.email}
                    </a>
                  </div>
                </div>
              )}

              {party.address && (
                <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Address</p>
                    <p className="font-medium text-gray-900 whitespace-pre-wrap text-sm">
                      {party.address}
                    </p>
                  </div>
                </div>
              )}

              {party.gstNumber && (
                <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <p className="text-xs text-indigo-600 font-medium">GST Number</p>
                  </div>
                  <p className="font-mono font-semibold text-indigo-900 text-sm">
                    {party.gstNumber}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment Performance */}
          {stats && (
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Performance</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Payment Rate</span>
                    <span className="font-bold text-gray-900">{stats.paymentRate}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${stats.paymentRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.paidChallans} of {stats.totalChallans} challans paid
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Collection Rate</span>
                    <span className="font-bold text-gray-900">{stats.collectionRate}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${stats.collectionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(stats.paidAmount)} collected
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-xs text-green-600 font-medium">Paid</p>
                    <p className="text-2xl font-bold text-green-900">{stats.paidChallans}</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                    <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-xs text-amber-600 font-medium">Pending</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {stats.openChallans + stats.overdueChallans}
                    </p>
                  </div>
                </div>

                {stats.overdueChallans > 0 && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-900">
                        {stats.overdueChallans} overdue challan{stats.overdueChallans > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Financial Summary */}
          {stats && (
            <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PieChart className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-blue-50 rounded-xl">
                  <span className="text-sm text-blue-700 font-medium">Total Business</span>
                  <span className="font-bold text-blue-900">
                    {formatCurrency(stats.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-xl">
                  <span className="text-sm text-green-700 font-medium">Amount Collected</span>
                  <span className="font-bold text-green-900">
                    {formatCurrency(stats.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-amber-50 rounded-xl">
                  <span className="text-sm text-amber-700 font-medium">Pending Amount</span>
                  <span className="font-bold text-amber-900">
                    {formatCurrency(stats.pendingAmount)}
                  </span>
                </div>
                {stats.totalInterest > 0 && (
                  <div className="flex justify-between p-3 bg-red-50 rounded-xl">
                    <span className="text-sm text-red-700 font-medium">Interest Accrued</span>
                    <span className="font-bold text-red-900">
                      {formatCurrency(stats.totalInterest)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Challans */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Challan History</h3>
                    <p className="text-sm text-gray-500">
                      {filteredChallans.length} challan{filteredChallans.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>

                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="60">Last 60 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 6 months</option>
                  <option value="365">Last year</option>
                  <option value="all">All time</option>
                </select>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search challan number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="all">All Status</option>
                  <option value="Open">Open</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="date-desc">Latest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                </select>
              </div>
            </div>

            {/* Challans List */}
            {filteredChallans.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No challans found</p>
                <p className="text-sm text-gray-400">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'No delivery challans in this period'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChallans.map((challan) => {
                  const daysOverdue = getDaysOverdue(challan.dueDate);
                  const totalPaid = challan.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                  const remaining = (challan.totals?.subtotalAmount || 0) - totalPaid;
                  
                  return (
                    <div
                      key={challan._id}
                      onClick={() => navigate(`/challans/${challan._id}`)}
                      className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900">{challan.challanNumber}</p>
                              {getStatusBadge(challan.status)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(challan.issueDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span>Due: {new Date(challan.dueDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short'
                              })}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/challans/${challan._id}`);
                          }}
                        >
                          View
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="bg-purple-50 p-2 rounded-lg">
                          <p className="text-xs text-purple-600">Items</p>
                          <p className="font-semibold text-purple-900">{challan.items?.length || 0}</p>
                        </div>
                        <div className="bg-pink-50 p-2 rounded-lg">
                          <p className="text-xs text-pink-600">Meters</p>
                          <p className="font-semibold text-pink-900">
                            {challan.totals?.totalMeters.toFixed(2)} m
                          </p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <p className="text-xs text-blue-600">Amount</p>
                          <p className="font-semibold text-blue-900">
                            {formatCurrency(challan.totals?.subtotalAmount)}
                          </p>
                        </div>
                        <div className={`p-2 rounded-lg ${
                          challan.currentInterest > 0 ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                          <p className={`text-xs ${
                            challan.currentInterest > 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>Interest</p>
                          <p className={`font-semibold ${
                            challan.currentInterest > 0 ? 'text-red-900' : 'text-gray-900'
                          }`}>
                            {challan.currentInterest > 0 
                              ? `+${formatCurrency(challan.currentInterest)}`
                              : '-'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      {challan.status !== 'Paid' && totalPaid > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Payment Progress</span>
                            <span className="font-semibold text-gray-900">
                              {((totalPaid / challan.totals?.subtotalAmount) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full transition-all duration-500"
                              style={{ width: `${(totalPaid / challan.totals?.subtotalAmount) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-green-600">Paid: {formatCurrency(totalPaid)}</span>
                            <span className="text-amber-600">Pending: {formatCurrency(remaining)}</span>
                          </div>
                        </div>
                      )}

                      {/* Alerts */}
                      <div className="flex flex-wrap gap-2">
                        {daysOverdue > 0 && challan.status !== 'Paid' && (
                          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">Overdue by {daysOverdue} days</span>
                          </div>
                        )}
                        {challan.status === 'Paid' && (
                          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            <span className="font-medium">Fully Paid</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartyDetails;