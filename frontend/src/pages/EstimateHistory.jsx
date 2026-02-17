import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart3,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import { estimateAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

const EstimateHistory = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [selectedEstimates, setSelectedEstimates] = useState([]);
  const [duplicateModal, setDuplicateModal] = useState({ open: false, estimate: null });
  const [newQualityName, setNewQualityName] = useState('');

  useEffect(() => {
    fetchEstimates();
  }, [pagination.page, sortBy]);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const response = await estimateAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        sort: sortBy,
        search: searchQuery,
      });
      setEstimates(response.data.estimates);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }));
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to fetch estimates');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchEstimates();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this estimate?')) return;

    try {
      await estimateAPI.delete(id);
      toast.success('Estimate deleted successfully');
      fetchEstimates();
    } catch (error) {
      console.error('Error deleting estimate:', error);
      toast.error('Failed to delete estimate');
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateModal.estimate) return;

    try {
      await estimateAPI.duplicate(duplicateModal.estimate._id, {
        newQualityName: newQualityName || `${duplicateModal.estimate.qualityName} (Copy)`,
      });
      toast.success('Estimate duplicated successfully');
      setDuplicateModal({ open: false, estimate: null });
      setNewQualityName('');
      fetchEstimates();
    } catch (error) {
      console.error('Error duplicating estimate:', error);
      toast.error('Failed to duplicate estimate');
    }
  };

  const handleSelectEstimate = (id) => {
    setSelectedEstimates(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedEstimates.length < 2) {
      toast.error('Select at least 2 estimates to compare');
      return;
    }
    navigate(`/estimates/compare?ids=${selectedEstimates.join(',')}`);
  };

  const sortOptions = [
    { value: 'createdAt', label: 'Date (Newest)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'cost', label: 'Cost (High to Low)' },
    { value: 'weight', label: 'Weight (High to Low)' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimate History</h1>
          <p className="text-gray-500 mt-1">
            {pagination.total} estimates found
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          {selectedEstimates.length >= 2 && (
            <Button
              variant="secondary"
              icon={BarChart3}
              onClick={handleCompare}
            >
              Compare ({selectedEstimates.length})
            </Button>
          )}
          <Button
            icon={Calendar}
            onClick={() => navigate('/estimates/new')}
          >
            New Estimate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by quality name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={sortOptions}
            />
          </div>
          <Button type="submit" variant="secondary" icon={Filter}>
            Filter
          </Button>
        </form>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      ) : estimates.length > 0 ? (
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500 w-12">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEstimates(estimates.map(est => est._id));
                        } else {
                          setSelectedEstimates([]);
                        }
                      }}
                      checked={selectedEstimates.length === estimates.length && estimates.length > 0}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Quality Name</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Total Weight</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Total Cost</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Weft-2</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {estimates.map((estimate) => (
                  <tr key={estimate._id} className="table-row-hover">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedEstimates.includes(estimate._id)}
                        onChange={() => handleSelectEstimate(estimate._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">{estimate.qualityName}</span>
                      {estimate.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {estimate.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="badge badge-info">{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {estimate.totalWeight?.toFixed(4)} gm
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-900">
                      {formatCurrency(estimate.totalCost, settings.currencySymbol)}
                    </td>
                    <td className="py-4 px-4">
                      {estimate.weft2Enabled ? (
                        <span className="badge badge-success">Yes</span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-600">No</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-500 text-sm">
                      {formatDate(estimate.createdAt, settings.dateFormat)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => navigate(`/estimates/${estimate._id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => navigate(`/estimates/edit/${estimate._id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => {
                            setDuplicateModal({ open: true, estimate });
                            setNewQualityName(`${estimate.qualityName} (Copy)`);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(estimate._id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'Try a different search term' : 'Create your first estimate to get started'}
          </p>
          <Button onClick={() => navigate('/estimates/new')}>
            Create Estimate
          </Button>
        </Card>
      )}

      {/* Duplicate Modal */}
      <Modal
        isOpen={duplicateModal.open}
        onClose={() => setDuplicateModal({ open: false, estimate: null })}
        title="Duplicate Estimate"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Enter a name for the duplicated estimate:
          </p>
          <Input
            label="Quality Name"
            value={newQualityName}
            onChange={(e) => setNewQualityName(e.target.value)}
            placeholder="Enter quality name"
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setDuplicateModal({ open: false, estimate: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicate}>
              Duplicate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EstimateHistory;