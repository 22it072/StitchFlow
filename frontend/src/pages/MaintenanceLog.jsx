// frontend/src/pages/MaintenanceLog.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Plus, ArrowLeft } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const MaintenanceLog = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/weaving')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl">
                <Wrench className="w-6 h-6 text-orange-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Maintenance Log</h1>
                <p className="text-gray-500 mt-1">Track loom maintenance and repairs</p>
              </div>
            </div>
          </div>
        </div>
        <Button
          icon={Plus}
          className="bg-gradient-to-r from-orange-600 to-orange-700"
        >
          Log Maintenance
        </Button>
      </div>

      {/* Coming Soon Card */}
      <Card className="text-center py-20">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Maintenance Log Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            Track preventive maintenance schedules, repairs, and loom service history.
            This feature is currently under development.
          </p>
          <div className="flex flex-col gap-3 max-w-sm mx-auto text-left">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-600">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Maintenance Scheduling</p>
                <p className="text-sm text-gray-600">Schedule preventive maintenance</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-600">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Repair Tracking</p>
                <p className="text-sm text-gray-600">Log repairs and spare parts used</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-600">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Cost Analysis</p>
                <p className="text-sm text-gray-600">Track maintenance costs per loom</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MaintenanceLog;