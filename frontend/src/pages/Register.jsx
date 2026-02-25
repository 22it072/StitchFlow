import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Building2, Phone,
  Eye, EyeOff, CheckCircle2, Circle,
  ArrowRight, Sparkles, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ============================================================
// Re-use StitchFlow Logo (same as Login)
// ============================================================
const StitchFlowLogo = ({ size = 'md', variant = 'dark' }) => {
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-lg', sub: 'text-xs' },
    md: { container: 'w-12 h-12', text: 'text-2xl', sub: 'text-sm' },
    lg: { container: 'w-16 h-16', text: 'text-3xl', sub: 'text-base' },
  };

  const s = sizes[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';
  const subColor = variant === 'light' ? 'text-indigo-200' : 'text-indigo-500';

  return (
    <div className="flex items-center space-x-3">
      <div className={`${s.container} relative flex-shrink-0`}>
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1 left-1 w-2 h-2 border border-white rounded-full" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border border-white rounded-full" />
          </div>
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3/4 h-3/4">
            <path d="M8 32 L28 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="27" cy="9" rx="3" ry="2" transform="rotate(-35 27 9)" stroke="white" strokeWidth="1.8" fill="none" />
            <path d="M8 32 Q18 20 22 28 Q26 36 34 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeDasharray="2 2" />
            <circle cx="12" cy="28" r="1.5" fill="white" opacity="0.9" />
            <circle cx="18" cy="22" r="1.5" fill="white" opacity="0.9" />
            <circle cx="24" cy="18" r="1.5" fill="white" opacity="0.9" />
          </svg>
        </div>
      </div>
      <div>
        <h1 className={`${s.text} font-bold tracking-tight ${textColor} leading-none`}>
          Stitch<span style={{ color: variant === 'light' ? '#a5b4fc' : '#4f46e5' }}>Flow</span>
        </h1>
        <p className={`${s.sub} font-medium ${subColor} leading-tight mt-0.5`}>
          Garment Pre-Costing Platform
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Fabric Pattern SVG
// ============================================================
const FabricPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="fabric2" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M0 20 H40 M20 0 V40" stroke="white" strokeWidth="0.5" />
        <circle cx="20" cy="20" r="2" fill="white" />
        <circle cx="0" cy="0" r="1" fill="white" />
        <circle cx="40" cy="0" r="1" fill="white" />
        <circle cx="0" cy="40" r="1" fill="white" />
        <circle cx="40" cy="40" r="1" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#fabric2)" />
  </svg>
);

// ============================================================
// Password Strength Indicator
// ============================================================
const PasswordStrength = ({ password }) => {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-yellow-400' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-blue-400' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const { score, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        label === 'Weak' ? 'text-red-500' :
        label === 'Fair' ? 'text-yellow-600' :
        label === 'Good' ? 'text-blue-600' : 'text-green-600'
      }`}>
        {label} password
      </p>
    </div>
  );
};

// ============================================================
// Form Input Component (inline for Register)
// ============================================================
const FormInput = ({
  label, type = 'text', name, value, onChange,
  placeholder, icon: Icon, error, required, suffix
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon size={16} className="text-gray-400" />
        </div>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'} py-2.5 text-sm bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200 ${error ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200'}`}
      />
      {suffix && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {suffix}
        </div>
      )}
    </div>
    {error && (
      <p className="mt-1.5 text-xs text-red-500 flex items-center space-x-1">
        <span>⚠</span><span>{error}</span>
      </p>
    )}
  </div>
);

// ============================================================
// Benefit Item
// ============================================================
const BenefitItem = ({ text }) => (
  <div className="flex items-center space-x-2.5">
    <CheckCircle2 size={16} className="text-indigo-300 flex-shrink-0" />
    <span className="text-indigo-100 text-sm">{text}</span>
  </div>
);

// ============================================================
// Step Indicator
// ============================================================
const StepIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center space-x-2 mb-6">
    {Array.from({ length: totalSteps }, (_, i) => (
      <React.Fragment key={i}>
        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
          i + 1 < currentStep ? 'bg-green-500 text-white' :
          i + 1 === currentStep ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' :
          'bg-gray-200 text-gray-400'
        }`}>
          {i + 1 < currentStep ? '✓' : i + 1}
        </div>
        {i < totalSteps - 1 && (
          <div className={`h-0.5 w-8 rounded-full transition-all duration-300 ${i + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ============================================================
// Main Register Component
// ============================================================
const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: '',
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Enter a valid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.agreeTerms) newErrors.agreeTerms = 'Please accept the terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    const success = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      company: formData.company,
      phone: formData.phone,
    });
    if (success) {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ===================== LEFT: Brand Panel ===================== */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 40%, #7c3aed 100%)' }}
      >
        <FabricPattern />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col justify-between p-12 h-full">

          {/* Top Logo */}
          <StitchFlowLogo size="md" variant="light" />

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-5">
                <Sparkles size={13} className="text-indigo-200" />
                <span className="text-indigo-100 text-xs font-semibold tracking-wide uppercase">
                  Join 1,200+ Textile Professionals
                </span>
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                Start Your Free
                <br />
                <span className="text-indigo-200">Pre-Costing Journey</span>
              </h2>
              <p className="text-indigo-200 text-base leading-relaxed">
                StitchFlow is the intelligent platform for fashion merchandisers and designers to get instant, accurate grey cloth estimates.
              </p>
            </div>

            {/* What You Get */}
            <div className="space-y-3">
              <p className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">
                What you get
              </p>
              <BenefitItem text="Real-time grey cloth weight & cost estimation" />
              <BenefitItem text="Yarn library with TPM & filament management" />
              <BenefitItem text="Industry-standard weight formatting functions" />
              <BenefitItem text="Estimate history, versioning & comparison" />
              <BenefitItem text="Multi-company & role-based access control" />
              <BenefitItem text="Production planning & analytics dashboard" />
            </div>

            {/* Quote */}
            <div className="p-5 rounded-2xl bg-white/10 border border-white/20">
              <p className="text-indigo-100 text-sm italic leading-relaxed">
                "StitchFlow cut our pre-costing time from hours to minutes. The grey cloth estimation accuracy is remarkable."
              </p>
              <div className="flex items-center space-x-2 mt-3">
                <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-bold">
                  RK
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Rahul Kapoor</p>
                  <p className="text-indigo-300 text-xs">Senior Merchandiser, Mumbai</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Badge */}
          <div className="flex items-center space-x-2">
            <Shield size={14} className="text-green-400" />
            <span className="text-indigo-300 text-xs">
              Your data is encrypted and company-isolated
            </span>
          </div>
        </div>
      </div>

      {/* ===================== RIGHT: Registration Form ===================== */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto bg-white">
        <div className="w-full max-w-[440px]">

          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <StitchFlowLogo size="md" variant="dark" />
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Create Account
            </h2>
            <p className="mt-1.5 text-gray-500 text-sm">
              Set up your StitchFlow account in just a few steps
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator currentStep={step} totalSteps={2} />

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 mb-5">
                <p className="text-indigo-700 text-xs font-semibold">
                  Step 1 of 2 — Personal & Company Details
                </p>
              </div>

              <FormInput
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                icon={User}
                error={errors.name}
                required
              />

              <FormInput
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                icon={Mail}
                error={errors.email}
                required
              />

              <FormInput
                label="Company / Organization"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Sharma Textiles Pvt. Ltd."
                icon={Building2}
              />

              <FormInput
                label="Phone Number"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                icon={Phone}
              />

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 mt-2"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Password & Terms ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 mb-5">
                <p className="text-purple-700 text-xs font-semibold">
                  Step 2 of 2 — Secure Your Account
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    className={`w-full pl-10 pr-12 py-2.5 text-sm bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200 ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500">⚠ {errors.password}</p>
                )}
                <PasswordStrength password={formData.password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className={`w-full pl-10 pr-12 py-2.5 text-sm bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200 ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center space-x-1">
                    <CheckCircle2 size={12} />
                    <span>Passwords match</span>
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500">⚠ {errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <label className="flex items-start cursor-pointer space-x-3">
                  <div className="mt-0.5 flex-shrink-0" onClick={() => setFormData({ ...formData, agreeTerms: !formData.agreeTerms })}>
                    {formData.agreeTerms ? (
                      <CheckCircle2 size={18} className="text-indigo-600" />
                    ) : (
                      <Circle size={18} className="text-gray-400" />
                    )}
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to StitchFlow's{' '}
                    <a href="#" className="text-indigo-600 font-medium hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-indigo-600 font-medium hover:underline">Privacy Policy</a>.
                    Your data is isolated per company and encrypted.
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p className="mt-2 text-xs text-red-500 pl-7">⚠ {errors.agreeTerms}</p>
                )}
              </div>

              {/* Buttons Row */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 font-semibold rounded-xl transition-all duration-200 text-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create My Account</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Sign in here
            </Link>
          </p>

          {/* Security Note */}
          <div className="mt-6 flex items-center justify-center space-x-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <Shield size={12} className="text-green-500" />
              <span>256-bit SSL</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <span>🔒</span>
              <span>Company Data Isolation</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <span>✨</span>
              <span>Free to Start</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;