// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff,
  TrendingUp, Shield, Sparkles, ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StitchFlowLogo from '../components/common/StitchFlowLogo';

/* ── small helpers ── */
const StatBadge = ({ value, label, icon: Icon }) => (
  <div className="flex flex-col items-center gap-1 bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-5 py-4">
    <Icon className="w-4 h-4 text-purple-200 mb-0.5" />
    <span className="text-2xl font-black text-white">{value}</span>
    <span className="text-xs font-medium text-purple-300">{label}</span>
  </div>
);

const FeatureRow = ({ text }) => (
  <li className="flex items-center gap-3 text-purple-100 text-sm font-medium">
    <CheckCircle className="w-4 h-4 text-purple-300 flex-shrink-0" />
    {text}
  </li>
);

/* ════════════════════════════════════════ */
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading]           = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [remember, setRemember]         = useState(false);
  const [form, setForm]                 = useState({ email: '', password: '' });

  const handle = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(form.email, form.password);
    if (ok) navigate('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">

      {/* ══════════ LEFT — brand panel ══════════ */}
      <aside className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col">

        {/* gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800" />

        {/* subtle fabric weave pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="lp" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M0 18 C6 12, 12 24, 18 18 C24 12, 30 24, 36 18"
                stroke="white" strokeWidth="1.2" fill="none" />
              <path d="M0 36 C6 30, 12 42, 18 36 C24 30, 30 42, 36 36"
                stroke="white" strokeWidth="1.2" fill="none" />
              <line x1="0" y1="0" x2="0" y2="36" stroke="white" strokeWidth="0.5" />
              <line x1="18" y1="0" x2="18" y2="36" stroke="white" strokeWidth="0.5" />
              <line x1="36" y1="0" x2="36" y2="36" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lp)" />
        </svg>

        {/* blur blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-80 h-80 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* ── content ── */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">

          {/* logo */}
          <StitchFlowLogo size="md" theme="white" />

          {/* centre copy */}
          <div className="space-y-8">
            {/* big icon
            <div className="w-[72px] h-[72px] bg-white/10 border border-white/20 rounded-3xl flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-11 h-11" fill="none">
                <path d="M6 36 C12 36,16 24,22 21 C28 18,30 30,36 27 C40 25,42 18,44 14"
                  stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <circle cx="6"  cy="36" r="3" fill="white" opacity="0.9"/>
                <circle cx="22" cy="21" r="2.5" fill="white" opacity="0.75"/>
                <circle cx="36" cy="27" r="2.5" fill="white" opacity="0.75"/>
                <circle cx="44" cy="14" r="2" fill="white" opacity="0.6"/>
                <line x1="44" y1="12" x2="46" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div> */}

            <div>
              <h2 className="text-[2.6rem] font-black text-white leading-[1.15] mb-4">
                Intelligent<br />
                Garment&nbsp;
                <span className="text-purple-300">Pre-Costing</span><br />
                Platform
              </h2>
              <p className="text-purple-200 text-[0.95rem] leading-relaxed max-w-[340px]">
                Input garment parameters and receive instant, high-accuracy
                grey cloth estimates — built for fashion merchandisers
                and textile designers.
              </p>
            </div>

            <ul className="space-y-2.5">
              {[
                'Grey cloth weight & cost in seconds',
                'Industry-standard warp & weft formulas',
                'Smart yarn library with auto-formatting',
                'Multi-company RBAC & team collaboration',
              ].map((f) => <FeatureRow key={f} text={f} />)}
            </ul>
          </div>

          {/* stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatBadge value="50K+" label="Estimates"   icon={TrendingUp} />
            <StatBadge value="2.5K+" label="Users"      icon={Sparkles}   />
            <StatBadge value="99%"   label="Accuracy"   icon={Shield}     />
          </div>
        </div>
      </aside>

      {/* ══════════ RIGHT — form panel ══════════ */}
      <main className="flex-1 flex items-center justify-center bg-gray-50 p-6 sm:p-10">
        <div className="w-full max-w-[420px]">

          {/* mobile logo */}
          <div className="lg:hidden mb-8">
            <StitchFlowLogo size="md" theme="dark" />
          </div>

          {/* heading */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-100 rounded-full text-xs font-semibold text-violet-700 mb-4">
              <Sparkles className="w-3 h-3" /> Welcome back
            </span>
            <h1 className="text-[2rem] font-black text-gray-900 leading-tight">
              Sign in to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                StitchFlow
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Access your garment costing workspace.
            </p>
          </div>

          {/* card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/70 border border-gray-100 p-8 space-y-5">
            <form onSubmit={submit} className="space-y-5">

              {/* email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email" name="email"
                    value={form.email} onChange={handle}
                    placeholder="you@company.com" required
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password} onChange={handle}
                    placeholder="Enter your password" required
                    className="w-full pl-10 pr-12 py-3 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* remember + forgot */}
              <div className="flex items-center justify-between">
                <label
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => setRemember((p) => !p)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                    ${remember ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`}>
                    {remember && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">Remember me</span>
                </label>
                <a href="#" className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* submit */}
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
                  hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold
                  shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40
                  transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                  flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to StitchFlow</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-violet-600 hover:text-violet-700 transition-colors">
              Create one free →
            </Link>
          </p>

          {/* trust row */}
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> SSL Secured
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> GDPR Compliant
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;