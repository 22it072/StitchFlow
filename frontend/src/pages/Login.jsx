import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

// ============================================================
// StitchFlow Brand Logo Component
// ============================================================
const StitchFlowLogo = ({ size = 'md', variant = 'dark' }) => {
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-lg', sub: 'text-xs' },
    md: { container: 'w-12 h-12', text: 'text-2xl', sub: 'text-sm' },
    lg: { container: 'w-16 h-16', text: 'text-3xl', sub: 'text-base' },
    xl: { container: 'w-20 h-20', text: 'text-4xl', sub: 'text-lg' },
  };

  const s = sizes[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';
  const subColor = variant === 'light' ? 'text-indigo-200' : 'text-indigo-500';

  return (
    <div className="flex items-center space-x-3">
      {/* Logo Icon - Thread/Needle inspired */}
      <div className={`${s.container} relative flex-shrink-0`}>
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1 left-1 w-2 h-2 border border-white rounded-full" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border border-white rounded-full" />
          </div>
          {/* SF Monogram with stitch lines */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4"
          >
            {/* Needle */}
            <path
              d="M8 32 L28 8"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Needle eye */}
            <ellipse
              cx="27"
              cy="9"
              rx="3"
              ry="2"
              transform="rotate(-35 27 9)"
              stroke="white"
              strokeWidth="1.8"
              fill="none"
            />
            {/* Thread curve */}
            <path
              d="M8 32 Q18 20 22 28 Q26 36 34 10"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 2"
            />
            {/* Stitch dots */}
            <circle cx="12" cy="28" r="1.5" fill="white" opacity="0.9" />
            <circle cx="18" cy="22" r="1.5" fill="white" opacity="0.9" />
            <circle cx="24" cy="18" r="1.5" fill="white" opacity="0.9" />
          </svg>
        </div>
      </div>
      {/* Brand Name */}
      <div>
        <h1 className={`${s.text} font-bold tracking-tight ${textColor} leading-none`}>
          Stitch<span className="text-indigo-600" style={{ color: variant === 'light' ? '#a5b4fc' : '#4f46e5' }}>Flow</span>
        </h1>
        <p className={`${s.sub} font-medium ${subColor} leading-tight mt-0.5`}>
          Garment Pre-Costing Platform
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Feature Highlight Card for Right Panel
// ============================================================
const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="flex items-start space-x-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h4 className="text-white font-semibold text-sm">{title}</h4>
      <p className="text-indigo-200 text-xs mt-0.5 leading-relaxed">{description}</p>
    </div>
  </div>
);

// ============================================================
// Animated Fabric/Thread Background Pattern
// ============================================================
const FabricPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-5"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="fabric" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M0 20 H40 M20 0 V40" stroke="white" strokeWidth="0.5" />
        <circle cx="20" cy="20" r="2" fill="white" />
        <circle cx="0" cy="0" r="1" fill="white" />
        <circle cx="40" cy="0" r="1" fill="white" />
        <circle cx="0" cy="40" r="1" fill="white" />
        <circle cx="40" cy="40" r="1" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#fabric)" />
  </svg>
);

// ============================================================
// Stat Badge
// ============================================================
const StatBadge = ({ value, label }) => (
  <div className="text-center p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
    <div className="text-3xl font-bold text-white">{value}</div>
    <div className="text-indigo-200 text-xs font-medium mt-1">{label}</div>
  </div>
);

// ============================================================
// Main Login Component
// ============================================================
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(formData.email, formData.password);
    if (success) {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ===================== LEFT: Login Form ===================== */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-[420px]">

          {/* Logo */}
          <div className="mb-10">
            <StitchFlowLogo size="md" variant="dark" />
          </div>

          {/* Welcome Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back 👋
            </h2>
            <p className="mt-2 text-gray-500 text-base leading-relaxed">
              Sign in to your account to continue managing your garment estimates.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4.5 h-4.5 text-gray-400" size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-12 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all ${formData.rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                    style={{ width: '18px', height: '18px' }}
                    onClick={() => setFormData({ ...formData, rememberMe: !formData.rememberMe })}
                  >
                    {formData.rememberMe && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                  Remember me
                </span>
              </label>
              <a
                href="#"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In to StitchFlow</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-xs text-gray-400 font-medium">New to StitchFlow?</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Sign Up Link */}
          <Link
            to="/register"
            className="w-full py-3 px-4 bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center text-sm"
          >
            Create a free account →
          </Link>

          {/* Trust Badge */}
          <div className="mt-8 flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <Shield size={13} className="text-green-500" />
              <span>SSL Secured</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <Sparkles size={13} className="text-indigo-500" />
              <span>Industry Standard</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <Zap size={13} className="text-yellow-500" />
              <span>Real-time Calc</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== RIGHT: Brand Panel ===================== */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 40%, #7c3aed 100%)'
        }}
      >
        {/* Fabric texture background */}
        <FabricPattern />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-white/5 transform -translate-y-1/2" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">

          {/* Top: Logo (light version) */}
          <StitchFlowLogo size="md" variant="light" />

          {/* Middle: Main Content */}
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-5">
                <Sparkles size={14} className="text-indigo-200" />
                <span className="text-indigo-100 text-xs font-semibold tracking-wide uppercase">
                  Intelligent Pre-Costing
                </span>
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                Accurate Grey Cloth
                <br />
                <span className="text-indigo-200">Estimation in Seconds</span>
              </h2>
              <p className="text-indigo-200 text-base leading-relaxed max-w-sm">
                Input garment parameters and receive instant, high-accuracy preliminary cost estimates trusted by fashion merchandisers and designers worldwide.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 max-w-sm">
              <FeatureCard
                icon={Zap}
                title="Real-Time Weight & Cost Calculation"
                description="Industry-standard formulas for warp, weft & grey cloth weight estimation"
              />
              <FeatureCard
                icon={TrendingUp}
                title="Yarn Library & Price Management"
                description="Manage yarn denier, TPM, filament count with auto-formatted display names"
              />
              <FeatureCard
                icon={Shield}
                title="Multi-Company Role-Based Access"
                description="Secure company isolation with admin, editor, and viewer permission levels"
              />
            </div>
          </div>

          {/* Bottom: Stats */}
          <div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatBadge value="50K+" label="Estimates Created" />
              <StatBadge value="1,200+" label="Active Users" />
              <StatBadge value="99.2%" label="Calculation Accuracy" />
            </div>
            <p className="text-indigo-300 text-xs text-center">
              Trusted by textile manufacturers and garment exporters
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;