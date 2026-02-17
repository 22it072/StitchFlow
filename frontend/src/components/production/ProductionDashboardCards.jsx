// frontend/src/components/production/ProductionDashboardCards.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Factory,
  Activity,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { productionAPI } from '../../services/api';

const ProductionDashboardCards = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await productionAPI.getStats();
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching production stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);
  
  if (loading) {
    return (
      <Card className="col-span-full">
        <div className="p-6 flex items-center justify-center">
          <Loader />
        </div>
      </Card>
    );
  }
  
  if (!stats) return null;
  
  const { summary, recentProductions } = stats;
  
  return (
    <>
      {/* Production Stats Cards */}
      <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Factory className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Daily</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {summary.avgDailyProduction?.toFixed(2) || '0'} m
          </div>
          <div className="text-sm opacity-80">Avg Daily Production</div>
        </div>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Avg</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {summary.avgEfficiency?.toFixed(1) || '0'}%
          </div>
          <div className="text-sm opacity-80">Average Efficiency</div>
        </div>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Total</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {summary.totalMachines || 0}
          </div>
          <div className="text-sm opacity-80">Machines Running</div>
        </div>
      </Card>
      
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Max</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {summary.maxDailyProduction?.toFixed(2) || '0'} m
          </div>
          <div className="text-sm opacity-80">Peak Production</div>
        </div>
      </Card>
      
      {/* Recent Productions */}
      <Card className="col-span-full lg:col-span-2">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Productions
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/production/history')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {recentProductions && recentProductions.length > 0 ? (
            <div className="space-y-3">
              {recentProductions.map((prod) => (
                <div
                  key={prod._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => navigate(`/production/${prod._id}`)}
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {prod.qualityName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(prod.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-indigo-600">
                      {prod.calculations?.formattedProduction}
                    </div>
                    <div className="text-xs text-gray-500">
                      {prod.loomParams?.efficiency}% eff
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Factory className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">No production records yet</p>
              <Button
                size="sm"
                onClick={() => navigate('/production/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Production
              </Button>
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

export default ProductionDashboardCards;