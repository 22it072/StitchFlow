// frontend/src/pages/JoinCompany.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ArrowRight, Users } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import toast from 'react-hot-toast';

const JoinCompany = () => {
  const navigate = useNavigate();
  const { joinCompany, createCompany, companies } = useCompany();
  
  const [activeTab, setActiveTab] = useState('join');
  const [joinCode, setJoinCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a company code');
      return;
    }

    setLoading(true);
    try {
      await joinCompany(joinCode.trim().toUpperCase());
      navigate('/dashboard');
    } catch (err) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    setLoading(true);
    try {
      await createCompany({ 
        name: companyName.trim(),
        description: companyDescription.trim()
      });
      navigate('/dashboard');
    } catch (err) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 
      flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl 
            bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {companies.length > 0 ? 'Add Another Company' : 'Get Started'}
          </h1>
          <p className="text-gray-600">
            Join an existing company or create your own
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'join'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Join Company
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Company
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'join' ? (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character code"
                    maxLength={8}
                    className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono 
                      border border-gray-300 rounded-xl 
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      bg-gray-50 text-gray-900 placeholder-gray-400 uppercase"
                  />
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    Ask your company admin for the join code
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || joinCode.length !== 8}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 
                    bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                    text-white font-medium rounded-xl transition-colors"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Join Company
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    maxLength={100}
                    className="w-full px-4 py-3 border border-gray-300 
                      rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Brief description of your company"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 
                      rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      bg-white text-gray-900 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !companyName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 
                    bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 
                    hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 
                    text-white font-medium rounded-xl transition-all"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Company
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Back Link */}
        {companies.length > 0 && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinCompany;