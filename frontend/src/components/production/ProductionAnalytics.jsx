// frontend/src/components/production/ProductionAnalytics.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import Card from '../common/Card';
import Select from '../common/Select';
import Loader from '../common/Loader';
import { productionAPI } from '../../services/api';

const ProductionAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await productionAPI.getAnalytics({ period });
        setAnalytics(response.data.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <div className="p-6 flex items-center justify-center h-64">
              <Loader />
            </div>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!analytics) return null;
  
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' }
          ]}
          className="w-40"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production vs Efficiency */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Production vs Efficiency
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="efficiency"
                  name="Efficiency"
                  unit="%"
                  domain={[0, 100]}
                />
                <YAxis
                  dataKey="production"
                  name="Production"
                  unit="m"
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'production' ? `${value.toFixed(2)} m` : `${value}%`,
                    name === 'production' ? 'Production' : 'Efficiency'
                  ]}
                />
                <Scatter
                  data={analytics.efficiencyCorrelation}
                  fill="#6366f1"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Production vs RPM */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Production vs RPM
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rpm" name="RPM" />
                <YAxis dataKey="production" name="Production" unit="m" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'production' ? `${value.toFixed(2)} m` : value,
                    name === 'production' ? 'Production' : 'RPM'
                  ]}
                />
                <Scatter
                  data={analytics.rpmCorrelation}
                  fill="#8b5cf6"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Machine Utilization */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Machine Utilization
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.machineUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" label={{ value: 'Machines', position: 'bottom' }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="avgProduction"
                  fill="#10b981"
                  name="Avg Production (m)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="count"
                  fill="#6366f1"
                  name="Records"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Daily Trend */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Daily Production Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="_id"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalProduction"
                  stroke="#6366f1"
                  name="Total Production (m)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgEfficiency"
                  stroke="#10b981"
                  name="Avg Efficiency (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProductionAnalytics;