import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Filter,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import { yarnAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import { 
  generateYarnDisplayName, 
  getYarnCategoryColor, 
  getYarnTypeColor,
  getYarnCategoryLabel 
} from '../utils/yarnFormatter';
import toast from 'react-hot-toast';

const YarnLibrary = () => {
  const { settings } = useSettings();
  const { notifyYarnSaved, notifySuccess } = useNotifications();
  const [yarns, setYarns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYarn, setEditingYarn] = useState(null);
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    denier: '',
    price: '',
    gstPercentage: settings.defaultGstPercentage || 5,
    yarnType: 'all',
    yarnCategory: 'spun',
    tpm: '',
    filamentCount: '',
    color: '#6366F1',
    description: '',
  });

  useEffect(() => {
    fetchYarns();
    fetchStats();
  }, [filterType, filterCategory]);

  const fetchYarns = async () => {
    try {
      setLoading(true);
      const response = await yarnAPI.getAll({ 
        type: filterType, 
        category: filterCategory,
        active: true 
      });
      setYarns(response.data);
    } catch (error) {
      console.error('Error fetching yarns:', error);
      toast.error('Failed to fetch yarns');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await yarnAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleOpenModal = (yarn = null) => {
    if (yarn) {
      setEditingYarn(yarn);
      setFormData({
        name: yarn.name,
        denier: yarn.denier,
        price: yarn.price,
        gstPercentage: yarn.gstPercentage,
        yarnType: yarn.yarnType,
        yarnCategory: yarn.yarnCategory || 'spun',
        tpm: yarn.tpm || '',
        filamentCount: yarn.filamentCount || '',
        color: yarn.color || '#6366F1',
        description: yarn.description || '',
      });
    } else {
      setEditingYarn(null);
      setFormData({
        name: '',
        denier: '',
        price: '',
        gstPercentage: settings.defaultGstPercentage || 5,
        yarnType: 'all',
        yarnCategory: 'spun',
        tpm: '',
        filamentCount: '',
        color: '#6366F1',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingYarn(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const yarnData = {
        ...formData,
        denier: parseFloat(formData.denier),
        price: parseFloat(formData.price),
        gstPercentage: parseFloat(formData.gstPercentage),
        tpm: formData.tpm ? parseFloat(formData.tpm) : null,
        filamentCount: formData.filamentCount ? parseInt(formData.filamentCount) : null,
      };

      if (editingYarn) {
        await yarnAPI.update(editingYarn._id, yarnData);
        notifyYarnSaved(formData.name, true);
      } else {
        await yarnAPI.create(yarnData);
        notifyYarnSaved(formData.name, false);
      }

      handleCloseModal();
      fetchYarns();
      fetchStats();
    } catch (error) {
      console.error('Error saving yarn:', error);
      toast.error('Failed to save yarn');
    }
  };

  const handleDelete = async (id, yarnName) => {
    if (!window.confirm('Are you sure you want to delete this yarn?')) return;

    try {
      await yarnAPI.delete(id);
      notifySuccess(`"${yarnName}" has been deleted`, 'Yarn Deleted');
      fetchYarns();
      fetchStats();
    } catch (error) {
      console.error('Error deleting yarn:', error);
      toast.error('Failed to delete yarn');
    }
  };

  const filteredYarns = yarns.filter(yarn => {
    const displayName = yarn.displayName || generateYarnDisplayName(yarn);
    return (
      yarn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const yarnTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'warp', label: 'Warp' },
    { value: 'weft', label: 'Weft' },
    { value: 'weft-2', label: 'Weft-2' },
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'spun', label: 'Spun Yarn' },
    { value: 'filament', label: 'Filament Yarn' },
  ];

  // Generate preview of display name
  const previewDisplayName = generateYarnDisplayName({
    name: formData.name,
    denier: parseFloat(formData.denier) || 0,
    yarnCategory: formData.yarnCategory,
    tpm: formData.tpm ? parseFloat(formData.tpm) : null,
    filamentCount: formData.filamentCount ? parseInt(formData.filamentCount) : null,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yarn Library</h1>
          <p className="text-gray-500 mt-1">Manage your yarn collection with advanced specifications</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => handleOpenModal()}
          className="mt-4 md:mt-0"
        >
          Add Yarn
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="p-4" className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <p className="text-indigo-100 text-sm">Total Yarns</p>
            <p className="text-2xl font-bold">{stats.overall?.totalYarns || 0}</p>
          </Card>
          <Card padding="p-4" className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <p className="text-amber-100 text-sm">Spun Yarns</p>
            <p className="text-2xl font-bold">{stats.overall?.spunYarns || 0}</p>
          </Card>
          <Card padding="p-4" className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <p className="text-cyan-100 text-sm">Filament Yarns</p>
            <p className="text-2xl font-bold">{stats.overall?.filamentYarns || 0}</p>
          </Card>
          <Card padding="p-4" className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <p className="text-green-100 text-sm">Avg. Price</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.overall?.avgPrice || 0, settings.currencySymbol)}
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search yarns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
          </div>
          <div className="w-full md:w-44">
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={categoryOptions}
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={yarnTypeOptions}
            />
          </div>
        </div>
      </Card>

      {/* Yarn Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      ) : filteredYarns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredYarns.map((yarn) => {
            const displayName = yarn.displayName || generateYarnDisplayName(yarn);
            
            return (
              <Card key={yarn._id} hover className="relative overflow-hidden">
                {/* Category Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getYarnCategoryColor(yarn.yarnCategory)}`}>
                    {yarn.yarnCategory === 'filament' ? '🧵 Filament' : '🧶 Spun'}
                  </span>
                </div>

                <div className="flex items-start space-x-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: yarn.color || '#E5E7EB' }}
                  >
                    <Layers className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 pr-16">
                    <h3 className="font-semibold text-gray-900 truncate" title={displayName}>
                      {displayName}
                    </h3>
                    <p className="text-sm text-gray-500">{yarn.name}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${getYarnTypeColor(yarn.yarnType)}`}>
                      {yarn.yarnType === 'all' ? 'All Types' : yarn.yarnType}
                    </span>
                  </div>
                </div>

                {/* Specifications */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">Denier</span>
                    <span className="text-sm font-semibold text-gray-900">{yarn.denier}D</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">Price</span>
                    <span className="text-sm font-semibold text-indigo-600">
                      {formatCurrency(yarn.price, settings.currencySymbol)}
                    </span>
                  </div>
                  {yarn.tpm && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <span className="text-xs text-gray-500 block">TPM</span>
                      <span className="text-sm font-semibold text-gray-900">{yarn.tpm}</span>
                    </div>
                  )}
                  {yarn.filamentCount && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <span className="text-xs text-gray-500 block">Filaments</span>
                      <span className="text-sm font-semibold text-gray-900">{yarn.filamentCount}</span>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">GST</span>
                    <span className="text-sm font-semibold text-gray-900">{yarn.gstPercentage}%</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">With GST</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(yarn.priceWithGst, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Usage & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">
                    Used in <span className="font-medium text-gray-700">{yarn.usageCount}</span> estimates
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenModal(yarn)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(yarn._id, yarn.name)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {yarn.description && (
                  <p className="mt-3 text-sm text-gray-500 border-t border-gray-100 pt-3 line-clamp-2">
                    {yarn.description}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No yarns found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'Try a different search term' : 'Get started by adding your first yarn'}
          </p>
          <Button icon={Plus} onClick={() => handleOpenModal()}>
            Add Yarn
          </Button>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingYarn ? 'Edit Yarn' : 'Add New Yarn'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview Display Name */}
          {formData.name && formData.denier && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Display Name Preview:</span>
              </div>
              <p className="text-lg font-semibold text-indigo-700 mt-1">
                {previewDisplayName || 'Enter name and denier...'}
              </p>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Yarn Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Polyester FDY"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Yarn Category <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, yarnCategory: 'spun', filamentCount: '' }))}
                  className={`
                    flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center space-x-2
                    ${formData.yarnCategory === 'spun'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }
                  `}
                >
                  <span className="text-lg">🧶</span>
                  <span className="font-medium">Spun Yarn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, yarnCategory: 'filament' }))}
                  className={`
                    flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center space-x-2
                    ${formData.yarnCategory === 'filament'
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }
                  `}
                >
                  <span className="text-lg">🧵</span>
                  <span className="font-medium">Filament</span>
                </button>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Technical Specifications</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Denier"
                name="denier"
                type="number"
                step="0.01"
                value={formData.denier}
                onChange={handleChange}
                placeholder="e.g., 150"
                required
              />
              <Input
                label="TPM (Twists Per Meter)"
                name="tpm"
                type="number"
                step="1"
                value={formData.tpm}
                onChange={handleChange}
                placeholder="e.g., 80"
              />
              {formData.yarnCategory === 'filament' && (
                <Input
                  label="Filament Count"
                  name="filamentCount"
                  type="number"
                  step="1"
                  value={formData.filamentCount}
                  onChange={handleChange}
                  placeholder="e.g., 48"
                />
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Pricing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., 150"
                required
              />
              <Input
                label="GST %"
                name="gstPercentage"
                type="number"
                step="0.01"
                value={formData.gstPercentage}
                onChange={handleChange}
                placeholder="e.g., 5"
                required
              />
            </div>
          </div>

          {/* Type & Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Yarn Type"
              name="yarnType"
              value={formData.yarnType}
              onChange={handleChange}
              options={[
                { value: 'all', label: 'All Types', description: 'Can be used for Warp, Weft, or Weft-2' },
                { value: 'warp', label: 'Warp Only' },
                { value: 'weft', label: 'Weft Only' },
                { value: 'weft-2', label: 'Weft-2 Only' },
              ]}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Color Tag
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                />
                <span className="text-sm text-gray-500">For visual identification</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              placeholder="Add notes about this yarn..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" icon={editingYarn ? Edit2 : Plus}>
              {editingYarn ? 'Update Yarn' : 'Add Yarn'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default YarnLibrary;