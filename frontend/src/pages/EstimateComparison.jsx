import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { estimateAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

const EstimateComparison = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEstimates = async (ids) => {
    try {
      setLoading(true);
      const response = await estimateAPI.compare(ids);
      setEstimates(response.data);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates for comparison');
      navigate('/estimates');
    } finally {
      setLoading(false);
    }
  };
  
  const chartData = {
    labels: estimates.map(e => e.qualityName.substring(0, 15)),
    datasets: [
      {
        label: 'Total Cost',
        data: estimates.map(e => e.totalCost),
        backgroundColor: '#4F46E5',
        borderRadius: 8,
      },
    ],
  };

  const weightChartData = {
    labels: estimates.map(e => e.qualityName.substring(0, 15)),
    datasets: [
      {
        label: 'Warp Weight',
        data: estimates.map(e => e.warp.formattedWeight),
        backgroundColor: '#3B82F6',
        borderRadius: 4,
      },
      {
        label: 'Weft Weight',
        data: estimates.map(e => e.weft.formattedWeight),
        backgroundColor: '#10B981',
        borderRadius: 4,
      },
      {
        label: 'Weft-2 Weight',
        data: estimates.map(e => e.weft2?.formattedWeight || 0),
        backgroundColor: '#8B5CF6',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        grid: { color: '#F3F4F6' },
      },
    },
  };

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);
    if (ids?.length >= 2) {
      fetchEstimates(ids);
    } else {
      toast.error('Select at least 2 estimates to compare');
      navigate('/estimates');
    }
  }, [searchParams, navigate]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/estimates')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estimate Comparison</h1>
            <p className="text-gray-500 mt-1">Comparing {estimates.length} estimates</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Comparison</h3>
          <div className="h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weight Breakdown</h3>
          <div className="h-64">
            <Bar data={weightChartData} options={chartOptions} />
          </div>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-4 text-sm font-medium text-gray-500 sticky left-0 bg-gray-50">
                  Metric
                </th>
                {estimates.map((estimate) => (
                  <th key={estimate._id} className="text-center py-4 px-6 text-sm font-medium text-gray-900">
                    {estimate.qualityName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Total Weight */}
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                  Total Weight
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center">
                    {e.totalWeight?.toFixed(4)} kg
                  </td>
                ))}
              </tr>
              {/* Total Cost */}
              <tr className="table-row-hover bg-indigo-50">
                <td className="py-3 px-4 font-medium text-indigo-900 sticky left-0 bg-indigo-50">
                  Total Cost
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center font-bold text-indigo-900">
                    {formatCurrency(e.totalCost, settings.currencySymbol)}
                  </td>
                ))}
              </tr>
              {/* Warp Weight */}
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                  Warp Weight
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center">
                    {e.warp.formattedWeight?.toFixed(4)}
                  </td>
                ))}
              </tr>
              {/* Warp Cost */}
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                  Warp Cost
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center">
                    {formatCurrency(e.warp.formattedCost, settings.currencySymbol)}
                  </td>
                ))}
              </tr>
              {/* Weft Weight */}
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                  Weft Weight
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center">
                    {e.weft.formattedWeight?.toFixed(4)}
                  </td>
                ))}
              </tr>
              {/* Weft Cost */}
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                  Weft Cost
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center">
                    {formatCurrency(e.weft.formattedCost, settings.currencySymbol)}
                  </td>
                ))}
              </tr>
              {/* Weft-2 */}
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                  Weft 2 Enabled
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center">
                    {e.weft2Enabled ? (
                      <span className="badge badge-success">Yes</span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-600">No</span>
                    )}
                  </td>
                ))}
              </tr>
              {/* Other Cost */}
              <tr className="table-row-hover">
                <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                  Other Cost
                </td>
                {estimates.map((e) => (
                  <td key={e._id} className="py-3 px-6 text-center">
                    {formatCurrency(e.otherCostPerMeter || 0, settings.currencySymbol)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-2">Lowest Cost</p>
          <p className="text-xl font-bold text-green-600">
            {estimates.reduce((min, e) => e.totalCost < min.totalCost ? e : min, estimates[0])?.qualityName}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {formatCurrency(
              Math.min(...estimates.map(e => e.totalCost)),
              settings.currencySymbol
            )}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-2">Highest Cost</p>
          <p className="text-xl font-bold text-red-600">
            {estimates.reduce((max, e) => e.totalCost > max.totalCost ? e : max, estimates[0])?.qualityName}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {formatCurrency(
              Math.max(...estimates.map(e => e.totalCost)),
              settings.currencySymbol
            )}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-2">Cost Difference</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(
              Math.max(...estimates.map(e => e.totalCost)) - 
              Math.min(...estimates.map(e => e.totalCost)),
              settings.currencySymbol
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {(((Math.max(...estimates.map(e => e.totalCost)) / 
               Math.min(...estimates.map(e => e.totalCost))) - 1) * 100).toFixed(1)}% variance
          </p>
        </Card>
      </div>
    </div>
  );
};

export default EstimateComparison;