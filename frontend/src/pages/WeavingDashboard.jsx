// frontend/src/pages/WeavingDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Factory,
  PackageCheck,
  Settings,
  TrendingUp,
  Plus,
  ArrowRight,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  RefreshCw,
  BarChart3,
  Zap,
  Package,
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { weavingAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useCompany } from '../context/CompanyContext';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionGuard } from '../components/guards/PermissionGuard';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';
import StatusIndicator from '../components/weaving/StatusIndicator';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WeavingDashboard = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { activeCompany, userRole } = useCompany();
  const { hasPermission, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

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

      console.log(`[WeavingDashboard] Fetching data for company: ${companyId}`);

      const response = await weavingAPI.getDashboard(companyId);

      if (lastFetchedCompanyId.current !== companyId) {
        console.log('[WeavingDashboard] Company changed during fetch, discarding results');
        return;
      }

      console.log('[WeavingDashboard] Data:', response.data);
      setDashboardData(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching weaving dashboard:', error);
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

  useEffect(() => {
    const companyId = activeCompany?._id;
    lastFetchedCompanyId.current = companyId;

    if (companyId) {
      setDashboardData(null);
      setError(null);
      setLoading(true);
      localStorage.setItem('activeCompanyId', companyId);
      fetchData(companyId);
    } else {
      setDashboardData(null);
      setLoading(false);
    }
  }, [activeCompany?._id, fetchData]);

  const handleRefresh = () => {
    if (activeCompany?._id) {
      fetchData(activeCompany._id, true);
    }
  };

  // Stat cards configuration
  const getStatCards = () => {
    const data = dashboardData || {};
    
    return [
      {
        title: 'Total Looms',
        value: data.totalLooms || 0,
        icon: Factory,
        color: 'from-blue-500 to-blue-600',
        subtitle: `${data.activeLooms || 0} active`,
        trend: data.loomUtilization ? `${data.loomUtilization.toFixed(1)}% utilization` : null,
      },
      {
        title: 'Active Sets',
        value: data.activeSets || 0,
        icon: PackageCheck,
        color: 'from-green-500 to-green-600',
        subtitle: `${data.totalSets || 0} total sets`,
        trend: data.completedSets ? `${data.completedSets} completed` : null,
      },
      {
        title: 'Total Beams',
        value: data.totalBeams || 0,
        icon: Package,
        color: 'from-purple-500 to-purple-600',
        subtitle: `${data.availableBeams || 0} available`,
        trend: data.beamsInUse ? `${data.beamsInUse} in use` : null,
      },
      {
        title: 'Avg Efficiency',
        value: `${(data.avgEfficiency || 0).toFixed(1)}%`,
        icon: TrendingUp,
        color: 'from-amber-500 to-amber-600',
        subtitle: 'Last 7 days',
        trend: data.efficiencyTrend || 'N/A',
      },
    ];
  };

  // Production stats cards
  const getProductionStats = () => {
    const production = dashboardData?.production || {};
    
    return [
      {
        title: 'Today',
        value: `${(production.today || 0).toFixed(2)} m`,
        icon: Zap,
        color: 'from-indigo-500 to-indigo-600',
      },
      {
        title: 'This Week',
        value: `${(production.thisWeek || 0).toFixed(2)} m`,
        icon: Activity,
        color: 'from-cyan-500 to-cyan-600',
      },
      {
        title: 'This Month',
        value: `${(production.thisMonth || 0).toFixed(2)} m`,
        icon: BarChart3,
        color: 'from-pink-500 to-pink-600',
      },
      {
        title: 'Total Records',
        value: production.totalRecords || 0,
        icon: Settings,
        color: 'from-orange-500 to-orange-600',
      },
    ];
  };

  const statCards = getStatCards();
  const productionStats = getProductionStats();

  // Loom status distribution
  const loomStatusData = dashboardData?.loomStatus || {};
  const doughnutData = {
    labels: ['Active', 'Idle', 'Maintenance', 'Breakdown'],
    datasets: [{
      data: [
        loomStatusData.Active || 0,
        loomStatusData.Idle || 0,
        loomStatusData.Maintenance || 0,
        loomStatusData.Breakdown || 0,
      ],
      backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  // Production trend chart
  const productionTrend = dashboardData?.productionTrend || [];
  const lineChartData = {
    labels: productionTrend.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Production (m)',
      data: productionTrend.map(t => t.production || 0),
      borderColor: '#4F46E5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  // Top performing looms
  const topLooms = dashboardData?.topLooms || [];
  const barChartData = {
    labels: topLooms.map(l => l.loomNumber || 'Unknown'),
    datasets: [{
      label: 'Efficiency (%)',
      data: topLooms.map(l => l.avgEfficiency || 0),
      backgroundColor: ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981'],
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 15, font: { size: 12 } },
      },
    },
  };

  // Recent production entries
  const recentProduction = dashboardData?.recentProduction || [];

  // Maintenance alerts
  const maintenanceAlerts = dashboardData?.maintenanceAlerts || [];

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Factory className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500 text-lg">No company selected</p>
        <Button onClick={() => navigate('/companies/join')}>
          Select or Join a Company
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Factory className="w-5 h-5" />
              Weaving Production Dashboard
            </h2>
            <p className="text-indigo-100 text-sm">
              {activeCompany?.name} • {userRole?.replace('_', ' ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 
                rounded-lg transition-colors text-sm font-medium ${
                  refreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weaving Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor looms, beams, and production metrics</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <PermissionGuard permission="production:create">
            <Button variant="secondary" icon={Settings} onClick={() => navigate('/weaving/sets')}>
              Manage Sets
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="production:create">
            <Button icon={Plus} onClick={() => navigate('/weaving/production/new')}>
              New Production Entry
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} hover className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  {stat.trend && (
                    <span className="text-xs font-medium text-indigo-600 mt-2 block">
                      {stat.trend}
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
        <PermissionGuard permission="production:view">
          <button
            onClick={() => navigate('/weaving/looms')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Factory className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-600">Looms</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="production:view">
          <button
            onClick={() => navigate('/weaving/beams')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
          >
            <Package className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-600">Beams</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="production:view">
          <button
            onClick={() => navigate('/weaving/sets')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
          >
            <PackageCheck className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-600">Sets</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="production:view">
          <button
            onClick={() => navigate('/weaving/production')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
          >
            <Activity className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-600">Production</span>
          </button>
        </PermissionGuard>
        <PermissionGuard permission="production:view">
          <button
            onClick={() => navigate('/weaving/maintenance')}
            className="flex items-center justify-center space-x-2 p-4 
              bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <Wrench className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-600">Maintenance</span>
          </button>
        </PermissionGuard>
      </div>

      {/* Production Overview */}
      <PermissionGuard permission="production:view">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-600" />
              Production Overview
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/weaving/production')}
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {productionStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-r ${stat.color} rounded-xl p-4 text-white`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-6 h-6 opacity-80" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm opacity-80">{stat.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </PermissionGuard>

      {/* Charts Row */}
      <PermissionGuard permission="analytics:view">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Loom Status Distribution */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Loom Status</h3>
              <Gauge className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </Card>

          {/* Production Trend */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Production Trend (Last 7 Days)</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </Card>
        </div>
      </PermissionGuard>

      {/* Top Looms & Maintenance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Looms */}
        <PermissionGuard permission="analytics:view">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Looms</h3>
              <Badge variant="success" icon={CheckCircle}>
                By Efficiency
              </Badge>
            </div>
            {topLooms.length > 0 ? (
              <div className="h-64">
                <Bar data={barChartData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <p>No data available</p>
              </div>
            )}
          </Card>
        </PermissionGuard>

        {/* Maintenance Alerts */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Alerts</h3>
            <Badge variant="warning" icon={AlertTriangle}>
              {maintenanceAlerts.length} Pending
            </Badge>
          </div>
          {maintenanceAlerts.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {maintenanceAlerts.map((alert) => (
                <div
                  key={alert._id}
                  onClick={() => navigate(`/weaving/maintenance/${alert._id}`)}
                  className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 
                    rounded-lg cursor-pointer transition-colors border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-200 rounded-lg">
                      <Wrench className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Loom {alert.loom?.loomNumber}</p>
                      <p className="text-sm text-gray-600">{alert.maintenanceType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="warning" size="sm">
                      {alert.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(alert.scheduledDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <CheckCircle className="w-12 h-12 mb-2" />
              <p>No pending maintenance</p>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Production Entries */}
      <PermissionGuard permission="production:view">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Production Entries</h3>
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/weaving/production')}
            >
              View All
            </Button>
          </div>
          {recentProduction.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Loom</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Set</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Production</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Efficiency</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProduction.map((entry) => (
                    <tr
                      key={entry._id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {entry.loom?.loomNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {entry.set?.setNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {entry.production?.toFixed(2)} m
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            entry.efficiency >= 80
                              ? 'success'
                              : entry.efficiency >= 60
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {entry.efficiency}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {formatRelativeTime(entry.date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/weaving/production/${entry._id}`)}
                        >
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
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No production entries yet</p>
              <PermissionGuard permission="production:create">
                <Button
                  className="mt-4"
                  icon={Plus}
                  onClick={() => navigate('/weaving/production/new')}
                >
                  Create First Entry
                </Button>
              </PermissionGuard>
            </div>
          )}
        </Card>
      </PermissionGuard>
    </div>
  );
};

export default WeavingDashboard;