// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, Layers, TrendingUp, Weight, Plus, ArrowRight,
  Clock, BarChart3, Factory, Activity, Gauge, Shield, RefreshCw, Building2,
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { analyticsAPI, productionAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useCompany } from '../context/CompanyContext';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionGuard } from '../components/guards/PermissionGuard';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

const FileText = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { activeCompany, userRole } = useCompany();
  const { hasPermission, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [productionStats, setProductionStats] = useState(null);
  const [error, setError] = useState(null);

  // Track which company ID we last fetched for
  const lastFetchedCompanyId = useRef(null);

  const fetchData = useCallback(async (companyId, isRefresh = false) => {
    if (!companyId) {
      setError('No active company selected');
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(`[Dashboard] Fetching data for company: ${companyId}`);

      // Explicitly pass companyId to EVERY API call
      const [analyticsRes, productionRes] = await Promise.all([
        analyticsAPI.getDashboard(companyId),
        productionAPI.getStats(companyId),
      ]);

      // Only update state if we're still looking at the same company
      // (prevents race conditions when switching quickly)
      if (lastFetchedCompanyId.current !== companyId) {
        console.log('[Dashboard] Company changed during fetch, discarding results');
        return;
      }

      console.log('[Dashboard] Analytics:', analyticsRes.data);
      console.log('[Dashboard] Production:', productionRes.data);

      setAnalytics(analyticsRes.data);
      setProductionStats(productionRes.data.data || productionRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Only set error if still on same company
      if (lastFetchedCompanyId.current === companyId) {
        setError('Failed to load dashboard data');
      }
    } finally {
      if (lastFetchedCompanyId.current === companyId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Re-fetch whenever active company changes
  useEffect(() => {
    const companyId = activeCompany?._id;
    
    // Update the ref immediately
    lastFetchedCompanyId.current = companyId;

    if (companyId) {
      // Clear old data immediately so stale data doesn't flash
      setAnalytics(null);
      setProductionStats(null);
      setError(null);
      setLoading(true);

      // Also ensure localStorage is in sync before API calls
      localStorage.setItem('activeCompanyId', companyId);

      fetchData(companyId);
    } else {
      setAnalytics(null);
      setProductionStats(null);
      setLoading(false);
    }
  }, [activeCompany?._id, fetchData]);

  const handleRefresh = () => {
    if (activeCompany?._id) {
      fetchData(activeCompany._id, true);
    }
  };

  // ─── Stat card builders (unchanged) ───
  const getStatCards = () => {
    const data = analytics?.data || analytics || {};
    const counts = data.counts || {};
    const estimateStats = data.estimateStats || {};

    const currentMonth = new Date().getMonth();
    const monthlyTrends = data.monthlyTrends || [];
    const currentMonthData = monthlyTrends.find(
      (t) => t._id?.month === currentMonth + 1
    );
    const lastMonthData = monthlyTrends.find(
      (t) => t._id?.month === currentMonth
    );

    const estimateChange =
      currentMonthData && lastMonthData && lastMonthData.count > 0
        ? (((currentMonthData.count - lastMonthData.count) /
            lastMonthData.count) * 100).toFixed(1)
        : 0;

    return [
      {
        title: 'Total Estimates',
        value: counts.totalEstimates || 0,
        icon: Calculator,
        color: 'from-indigo-500 to-indigo-600',
        change: estimateChange !== 0
          ? `${estimateChange > 0 ? '+' : ''}${estimateChange}%`
          : 'N/A',
        loading: !analytics,
      },
      {
        title: 'Saved Yarns',
        value: counts.totalYarns || 0,
        icon: Layers,
        color: 'from-emerald-500 to-emerald-600',
        change: 'N/A',
        loading: !analytics,
      },
      {
        title: 'Average Cost',
        value: formatCurrency(estimateStats.avgCost || 0, settings.currencySymbol),
        icon: TrendingUp,
        color: 'from-amber-500 to-amber-600',
        change: estimateStats.costTrend || 'N/A',
        loading: !analytics,
      },
      {
        title: 'Total Weight',
        value: `${(estimateStats.totalWeight || 0).toFixed(2)} kg`,
        icon: Weight,
        color: 'from-purple-500 to-purple-600',
        change: estimateStats.weightTrend || 'N/A',
        loading: !analytics,
      },
    ];
  };

  const getProductionStatCards = () => {
    const stats = productionStats?.summary || {};
    return [
      {
        title: 'Avg Daily Production',
        value: `${(stats.avgDailyProduction || 0).toFixed(2)} m`,
        icon: Factory,
        color: 'from-blue-500 to-blue-600',
      },
      {
        title: 'Avg Efficiency',
        value: `${(stats.avgEfficiency || 0).toFixed(1)}%`,
        icon: Activity,
        color: 'from-green-500 to-green-600',
      },
      {
        title: 'Total Machines',
        value: stats.totalMachines || 0,
        icon: Gauge,
        color: 'from-orange-500 to-orange-600',
      },
      {
        title: 'Production Records',
        value: stats.totalRecords || 0,
        icon: FileText,
        color: 'from-pink-500 to-pink-600',
      },
    ];
  };

  const statCards = getStatCards();
  const productionStatCards = getProductionStatCards();

  // Chart data
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const analyticsData = analytics?.data || analytics || {};
  const trendData = analyticsData.monthlyTrends || [];

  const lineChartData = {
    labels: trendData.map((t) => t._id ? monthNames[t._id.month - 1] : ''),
    datasets: [{
      label: 'Estimates',
      data: trendData.map((t) => t.count || 0),
      borderColor: '#4F46E5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const mostUsedYarns = analyticsData.mostUsedYarns || [];
  const barChartData = {
    labels: mostUsedYarns.map((y) => (y.name || '').substring(0, 10)),
    datasets: [{
      label: 'Usage Count',
      data: mostUsedYarns.map((y) => y.usageCount || 0),
      backgroundColor: ['#4F46E5','#7C3AED','#EC4899','#F59E0B','#10B981'],
      borderRadius: 8,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#F3F4F6' } },
    },
  };

  const recentEstimates = analyticsData.recentEstimates || [];

  // ─── No company selected ───
  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Building2 className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500 text-lg">No company selected</p>
        <Button onClick={() => navigate('/companies/join')}>
          Select or Join a Company
        </Button>
      </div>
    );
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-xl" />
          <div className="h-80 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => fetchData(activeCompany._id)}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Company & Role Info Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {activeCompany?.name}
            </h2>
            <p className="text-indigo-100 text-sm">
              Logged in as{' '}
              <span className="font-medium capitalize">
                {userRole?.replace('_', ' ')}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 
                rounded-lg transition-colors text-sm font-medium ${
                  refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/company/users')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 
                  rounded-lg transition-colors text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                Manage Team
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Overview of your textile costing activities
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <PermissionGuard permission="yarns:create">
            <Button variant="secondary" icon={Layers} onClick={() => navigate('/yarns')}>
              Add Yarn
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="estimates:create">
            <Button icon={Plus} onClick={() => navigate('/estimates/new')}>
              New Estimate
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} hover className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.loading ? (
                      <span className="inline-block h-8 w-20 bg-gray-200 rounded animate-pulse" />
                    ) : stat.value}
                  </p>
                  {stat.change !== 'N/A' && (
                    <span className={`text-xs font-medium ${
                      String(stat.change).startsWith('+') ? 'text-green-600'
                        : String(stat.change).startsWith('-') ? 'text-red-600'
                        : 'text-gray-500'
                    }`}>
                      {stat.change} from last month
                    </span>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} 
                  flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PermissionGuard permission="estimates:create">
          <button onClick={() => navigate('/estimates/new')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
            <Plus className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-indigo-600">New Estimate</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="yarns:create">
          <button onClick={() => navigate('/yarns')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-emerald-600">Add Yarn</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="production:create">
          <button onClick={() => navigate('/productions/new')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
            <Factory className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-600">Production Plan</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="estimates:view">
          <button onClick={() => navigate('/estimates')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-600">Estimate History</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="production:view">
          <button onClick={() => navigate('/productions')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-600">Production History</span>
          </button>
        </PermissionGuard>
      </div>

      {/* Production Overview */}
      <PermissionGuard permission="production:view">
        {productionStats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Factory className="w-5 h-5 mr-2 text-indigo-600" />
                Production Overview
              </h2>
              <Button variant="ghost" size="sm" icon={ArrowRight}
                onClick={() => navigate('/productions')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {productionStatCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index}
                    className={`bg-gradient-to-r ${stat.color} rounded-xl p-4 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-6 h-6 opacity-80" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm opacity-80">{stat.title}</p>
                  </div>
                );
              })}
            </div>
            {productionStats?.recentProductions?.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold text-gray-900">Recent Productions</h3>
                </div>
                <div className="space-y-3">
                  {productionStats.recentProductions.map((prod) => (
                    <div key={prod._id}
                      onClick={() => navigate(`/productions/${prod._id}`)}
                      className="flex items-center justify-between p-3 bg-gray-50 
                        hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{prod.qualityName}</p>
                        <p className="text-sm text-gray-500">{formatRelativeTime(prod.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-indigo-600">
                          {prod.calculations?.formattedProduction}
                          <span className="text-xs text-gray-400 ml-1">
                            (×{prod.calculations?.formattedScale})
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {prod.loomParams?.efficiency}% efficiency
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </PermissionGuard>

      {/* Charts */}
      <PermissionGuard permission="analytics:view">
        {(trendData.length > 0 || mostUsedYarns.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {trendData.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="h-64">
                  <Line data={lineChartData} options={chartOptions} />
                </div>
              </Card>
            )}
            {mostUsedYarns.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Most Used Yarns</h3>
                  <Layers className="w-5 h-5 text-gray-400" />
                </div>
                <div className="h-64">
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </Card>
            )}
          </div>
        )}
      </PermissionGuard>

      {/* Recent Estimates */}
      <PermissionGuard permission="estimates:view">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Estimates</h3>
            <Button variant="ghost" size="sm" icon={ArrowRight}
              onClick={() => navigate('/estimates')}>
              View All
            </Button>
          </div>
          {recentEstimates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Quality Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Total Weight</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Total Cost</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEstimates.map((estimate) => (
                    <tr key={estimate._id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{estimate.qualityName}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {(estimate.totalWeight || 0).toFixed(4)} kg
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatCurrency(estimate.totalCost || 0, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {formatRelativeTime(estimate.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm"
                          onClick={() => navigate(`/estimates/${estimate._id}`)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No estimates yet</p>
              <PermissionGuard permission="estimates:create">
                <Button className="mt-4" icon={Plus}
                  onClick={() => navigate('/estimates/new')}>
                  Create First Estimate
                </Button>
              </PermissionGuard>
            </div>
          )}
        </Card>
      </PermissionGuard>
    </div>
  );
};

export default Dashboard;