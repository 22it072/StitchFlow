// frontend/src/pages/ProductionAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  Activity,
  Factory,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import { productionAPI } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

const ProductionAnalytics = () => {
  const navigate = useNavigate();
  const { notifyError } = useNotifications();
  
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await productionAPI.getAnalytics({ period });
      setAnalytics(response.data.data);
    } catch (error) {
      notifyError('Error fetching analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const chartColors = {
    primary: '#4F46E5',
    secondary: '#7C3AED',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
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
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/productions')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Analytics</h1>
            <p className="text-gray-500 mt-1">
              Analyze production trends, efficiency, and machine utilization
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            className="w-40"
          />
          <Button variant="secondary" icon={RefreshCw} onClick={fetchAnalytics}>
            Refresh
          </Button>
        </div>
      </div>

      {analytics && (analytics.efficiencyCorrelation?.length > 0 || 
                     analytics.dailyTrend?.length > 0 || 
                     analytics.machineUtilization?.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Production vs Efficiency Scatter */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Production vs Efficiency
              </h3>
            </div>
            <div className="h-80">
              {analytics.efficiencyCorrelation?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="efficiency"
                      name="Efficiency"
                      unit="%"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="production"
                      name="Production"
                      unit="m"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                              <p className="font-medium text-gray-900">{data.quality}</p>
                              <p className="text-sm text-gray-600">
                                Efficiency: {data.efficiency}%
                              </p>
                              <p className="text-sm text-gray-600">
                                Production: {data.production?.toFixed(2)} m
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      data={analytics.efficiencyCorrelation}
                      fill={chartColors.primary}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </Card>

          {/* Production vs RPM Scatter */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Production vs RPM
              </h3>
            </div>
            <div className="h-80">
              {analytics.rpmCorrelation?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="rpm"
                      name="RPM"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="production"
                      name="Production"
                      unit="m"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                              <p className="font-medium text-gray-900">{data.quality}</p>
                              <p className="text-sm text-gray-600">RPM: {data.rpm}</p>
                              <p className="text-sm text-gray-600">
                                Production: {data.production?.toFixed(2)} m
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      data={analytics.rpmCorrelation}
                      fill={chartColors.secondary}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </Card>

          {/* Machine Utilization Bar Chart */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Factory className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Machine Utilization
              </h3>
            </div>
            <div className="h-80">
              {analytics.machineUtilization?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.machineUtilization}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="_id"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Machines', position: 'bottom', offset: -5 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      content={({ payload, label }) => {
                        if (payload && payload.length > 0) {
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                              <p className="font-medium text-gray-900">
                                {label} Machines
                              </p>
                              <p className="text-sm text-green-600">
                                Avg Production: {payload[0]?.value?.toFixed(2)} m
                              </p>
                              <p className="text-sm text-indigo-600">
                                Records: {payload[1]?.value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="avgProduction"
                      fill={chartColors.success}
                      name="Avg Production (m)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="count"
                      fill={chartColors.primary}
                      name="Records"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </Card>

          {/* Daily Production Trend */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Daily Production Trend
              </h3>
            </div>
            <div className="h-80">
              {analytics.dailyTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="_id"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        });
                      }}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      content={({ payload, label }) => {
                        if (payload && payload.length > 0) {
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                              <p className="font-medium text-gray-900">
                                {new Date(label).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-indigo-600">
                                Total Production: {payload[0]?.value?.toFixed(2)} m
                              </p>
                              <p className="text-sm text-green-600">
                                Avg Efficiency: {payload[1]?.value?.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalProduction"
                      stroke={chartColors.primary}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Total Production (m)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgEfficiency"
                      stroke={chartColors.success}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Avg Efficiency (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Analytics Data
            </h3>
            <p className="text-gray-500 mb-4">
              Create some production records to see analytics
            </p>
            <Button onClick={() => navigate('/productions/new')}>
              Create Production
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductionAnalytics;