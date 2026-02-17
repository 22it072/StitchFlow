// frontend/src/components/company/JoinCodeDisplay.jsx
import React, { useState } from 'react';
import { Copy, RefreshCw, Check, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const JoinCodeDisplay = ({ companyCode, companyId, onCodeRegenerated }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(companyCode);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerating the code will invalidate the current code. Continue?')) {
      return;
    }

    setRegenerating(true);
    try {
      const response = await api.post(`/companies/${companyId}/regenerate-code`);
      onCodeRegenerated?.(response.data.data.companyCode);
      toast.success('Company code regenerated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate code');
    } finally {
      setRegenerating(false);
    }
  };

  const displayCode = isVisible ? companyCode : '••••••••';

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Company Join Code
        </h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 font-mono text-2xl tracking-widest text-center py-3 px-4 
          bg-white rounded-lg border-2 border-dashed border-gray-300 text-gray-900">
          {displayCode}
        </div>
        <button
          onClick={handleCopy}
          className={`p-3 rounded-lg transition-colors ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Share this code with team members to let them join your company.
      </p>

      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="flex items-center gap-2 text-sm text-orange-600 
          hover:text-orange-700 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
        {regenerating ? 'Regenerating...' : 'Regenerate Code'}
      </button>
    </div>
  );
};

export default JoinCodeDisplay;