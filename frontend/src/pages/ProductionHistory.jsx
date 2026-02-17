// frontend/src/pages/ProductionHistory.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Factory,
  RefreshCw,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { productionAPI } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { formatRelativeTime } from '../utils/formatters';

const ProductionHistory = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();
  
  // State
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sortBy: 'createdAt',
    order: 'desc'
  });
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [deleting, setDeleting] = useState(false);

  // Fetch productions
  const fetchProductions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productionAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      setProductions(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));
    } catch (error) {
      notifyError('Error fetching production records');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, notifyError]);

  useEffect(() => {
    fetchProductions();
  }, [fetchProductions]);

  // Handle search with debounce
  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteModal.id) return;
    
    setDeleting(true);
    try {
      await productionAPI.delete(deleteModal.id);
      notifySuccess('Production record deleted successfully');
      setDeleteModal({ open: false, id: null, name: '' });
      fetchProductions();
    } catch (error) {
      notifyError('Error deleting production record');
    } finally {
      setDeleting(false);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production History</h1>
          <p className="text-gray-500 mt-1">View and manage production records</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchProductions}>
            Refresh
          </Button>
          <Button icon={Plus} onClick={() => navigate('/productions/new')}>
            New Production
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by quality name..."
              value={filters.search}
              onChange={handleSearch}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' }
            ]}
            className="w-full md:w-40"
          />
          <Select
            name="sortBy"
            value={filters.sortBy}
            onChange={handleFilterChange}
            options={[
              { value: 'createdAt', label: 'Date Created' },
              { value: 'qualityName', label: 'Quality Name' },
              { value: 'loomParams.efficiency', label: 'Efficiency' }
            ]}
            className="w-full md:w-40"
          />
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : productions.length === 0 ? (
          <div className="text-center py-12">
            <Factory className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No production records
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first production plan to get started
            </p>
            <Button icon={Plus} onClick={() => navigate('/productions/new')}>
              Create Production Plan
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Quality Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">RPM</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Pick</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Efficiency</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Machines</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Daily Production</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productions.map((prod) => (
                    <tr key={prod._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{prod.qualityName}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{prod.loomParams?.rpm}</td>
                      <td className="py-3 px-4 text-gray-600">{prod.loomParams?.pick}</td>
                      <td className="py-3 px-4">
                        <Badge variant={prod.loomParams?.efficiency >= 80 ? 'success' : 'warning'}>
                          {prod.loomParams?.efficiency}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{prod.loomParams?.machines}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-indigo-600">
                          {prod.calculations?.rawProductionMeters?.toFixed(2)}
                        </span>
                        {/* <span className="text-xs text-gray-400 ml-1">
                          (×{prod.calculations?.formattedScale})
                        </span> */}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusVariant(prod.status)}>
                          {prod.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {formatRelativeTime(prod.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/productions/${prod._id}`)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ 
                              open: true, 
                              id: prod._id, 
                              name: prod.qualityName 
                            })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
        title="Delete Production Record"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-medium">"{deleteModal.name}"</span>? 
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, id: null, name: '' })}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionHistory;