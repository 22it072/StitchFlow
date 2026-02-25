// frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Building2, Phone,
  Eye, EyeOff, CheckCircle2, ArrowRight,
  Layers, BarChart3, Users, Sparkles, Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StitchFlowLogo from '../components/common/StitchFlowLogo';

/* ── Password strength ── */
const getStrength = (p) => {
  let s = 0;
  if (p.length >= 6)           s++;
  if (p.length >= 10)          s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};
const strengthMeta = [
  { label: 'Very Weak', bar: 'bg-red-500',    text: 'text-red-600'    },
  { label: 'Weak',      bar: 'bg-orange-500', text: 'text-orange-600' },
  { label: 'Fair',      bar: 'bg-yellow-500', text: 'text-yellow-600' },
  { label: 'Good',      bar: 'bg-blue-500',   text: 'text-blue-600'   },
  { label: 'Strong',    bar: 'bg-green-500',  text: 'text-green-600'  },
];

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const score = Math.min(getStrength(password), 4);
  const meta  = strengthMeta[score];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0,1,2,3,4].map((i) => (
          <div key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300
              ${i <= score ? meta.bar : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${meta.text}`}>{meta.label}</p>
    </div>
  );
};

/* ── Benefit card (left panel) ── */
const BenefitCard = ({ icon: Icon, title, desc, accent }) => (
  <div className={`flex items-start gap-3 p-4 rounded-2xl bg-white/10 border border-white/20`}>
    <div className={`w-9 h-9 ${accent} rounded-xl flex items-center justify-center flex-shrink-0`}>
      <Icon className="w-[18px] h-[18px] text-white" />
    </div>
    <div>
      <p className="text-white text-sm font-bold leading-snug">{title}</p>
      <p className="text-purple-200 text-xs mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

/* ── Labelled input ── */
const Field = ({
  label, name, type = 'text', value, onChange,
  placeholder, Icon, error, required, hint, suffix,
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}{required && <span className="text-violet-500 ml-0.5">*</span>}
    </label>
    {hint && <p className="text-[11px] text-gray-400 mb-1.5">{hint}</p>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
      <input
        type={type} name={name} value={value}
        onChange={onChange} placeholder={placeholder} required={required}
        className={`w-full py-3 text-sm font-medium bg-gray-50 border rounded-xl
          text-gray-900 placeholder-gray-400 transition-all
          focus:outline-none focus:ring-2 focus:ring-violet-500/20
          focus:border-violet-400 focus:bg-white
          ${Icon  ? 'pl-10' : 'pl-4'}
          ${suffix ? 'pr-12' : 'pr-4'}
          ${error ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200'}`}
      />
      {suffix && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
    </div>
    {error && (
      <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"/>
        </svg>
        {error}
      </p>
    )}
  </div>
);

/* ════════════════════════════════════════ */
const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [loading,      setLoading]      = useState(false);
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [agreed,       setAgreed]       = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    confirmPassword: '', company: '', phone: '',
  });
  const [errors, setErrors] = useState({});

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                           e.name = 'Full name is required';
    if (!form.email)                                 e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))      e.email = 'Enter a valid email';
    if (!form.password)                              e.password = 'Password is required';
    else if (form.password.length < 6)               e.password = 'Minimum 6 characters';
    if (!form.confirmPassword)                       e.confirmPassword = 'Please confirm password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!agreed)                                     e.terms = 'You must agree to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const ok = await register({
      name: form.name, email: form.email, password: form.password,
      company: form.company, phone: form.phone,
    });
    if (ok) navigate('/dashboard');
    setLoading(false);
  };

  const passwordsMatch =
    form.confirmPassword && form.password === form.confirmPassword;

  return (
    <div className="min-h-screen flex">

      {/* ══════════ LEFT — brand panel ══════════ */}
      <aside className="hidden lg:flex lg:w-[44%] relative overflow-hidden flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800" />

        {/* weave texture */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]">
          <defs>
            <pattern id="rp" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M0 18 C6 12,12 24,18 18 C24 12,30 24,36 18"
                stroke="white" strokeWidth="1.2" fill="none"/>
              <line x1="0" y1="0" x2="0" y2="36" stroke="white" strokeWidth="0.5"/>
              <line x1="18" y1="0" x2="18" y2="36" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rp)"/>
        </svg>

        <div className="absolute -top-32 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"/>

        <div className="relative z-10 flex flex-col justify-between h-full p-10">

          {/* logo */}
          <StitchFlowLogo size="md" theme="white" />

          {/* copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 border border-white/25 rounded-full">
              <Sparkles className="w-3 h-3 text-purple-200" />
              <span className="text-xs font-semibold text-purple-100">Start Free — No Credit Card</span>
            </div>

            <div>
              <h2 className="text-3xl font-black text-white leading-tight mb-3">
                Join <span className="text-purple-300">2,500+</span><br />
                Textile Professionals
              </h2>
              <p className="text-purple-200 text-sm leading-relaxed">
                Precision garment pre-costing for fashion merchandisers,
                designers, and textile manufacturers.
              </p>
            </div>

            <div className="space-y-3">
              <BenefitCard
                icon={Layers}
                title="Grey Cloth Estimation"
                desc="Instant warp & weft calculations with industry formulas"
                accent="bg-violet-500/50"
              />
              <BenefitCard
                icon={BarChart3}
                title="Smart Yarn Library"
                desc="Auto-formatted names with denier, TPM & filament specs"
                accent="bg-indigo-500/50"
              />
              <BenefitCard
                icon={Users}
                title="Team Collaboration"
                desc="Multi-company RBAC with role-based access control"
                accent="bg-purple-500/50"
              />
            </div>
          </div>

          {/* testimonial */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <div className="flex mb-2">
              {[1,2,3,4,5].map((i) => (
                <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <p className="text-white text-xs italic leading-relaxed mb-3">
              "What used to take our team hours now takes minutes — with better accuracy."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-300 to-indigo-300 flex items-center justify-center">
                <span className="text-[10px] font-black text-violet-800">RS</span>
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-none">Rajesh Sharma</p>
                <p className="text-purple-300 text-[10px]">Head Merchandiser · FabricHouse</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════ RIGHT — form panel ══════════ */}
      <main className="flex-1 flex items-start justify-center bg-gray-50 p-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-[460px] py-8">

          {/* mobile logo */}
          <div className="lg:hidden mb-8">
            <StitchFlowLogo size="md" theme="dark" />
          </div>

          {/* heading */}
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-100 rounded-full text-xs font-semibold text-violet-700 mb-4">
              <CheckCircle2 className="w-3 h-3" /> Free Account — No Credit Card
            </span>
            <h1 className="text-[2rem] font-black text-gray-900 leading-tight">
              Create your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                StitchFlow
              </span>{' '}
              account
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Start estimating garment costs with precision today.
            </p>
          </div>

          {/* ── FORM CARD ── */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-7 space-y-6">
            <form onSubmit={submit} className="space-y-6">

              {/* ─ Section 1: Personal ─ */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Personal Info
                  </span>
                </div>
                <div className="space-y-4">
                  <Field
                    label="Full Name" name="name"
                    value={form.name} onChange={handle}
                    placeholder="Priya Sharma"
                    Icon={User} error={errors.name} required
                  />
                  <Field
                    label="Email Address" name="email" type="email"
                    value={form.email} onChange={handle}
                    placeholder="you@company.com"
                    Icon={Mail} error={errors.email} required
                  />
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* ─ Section 2: Security ─ */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Security
                  </span>
                </div>
                <div className="space-y-4">
                  {/* password */}
                  <div>
                    <Field
                      label="Password" name="password" type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={handle}
                      placeholder="Min. 6 characters"
                      Icon={Lock} error={errors.password} required
                      suffix={
                        <button type="button" onClick={() => setShowPass((p) => !p)}
                          className="text-gray-400 hover:text-gray-600 transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                      }
                    />
                    <PasswordStrength password={form.password} />
                  </div>

                  {/* confirm */}
                  <div>
                    <Field
                      label="Confirm Password" name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword} onChange={handle}
                      placeholder="Re-enter your password"
                      Icon={Lock} error={errors.confirmPassword} required
                      suffix={
                        <button type="button" onClick={() => setShowConfirm((p) => !p)}
                          className="text-gray-400 hover:text-gray-600 transition-colors">
                          {showConfirm ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                      }
                    />
                    {passwordsMatch && (
                      <p className="mt-1 text-xs font-semibold text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3"/> Passwords match
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* ─ Section 3: Company (optional) ─ */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Company
                  </span>
                  <span className="text-[10px] text-gray-300 font-semibold">(optional)</span>
                </div>
                <div className="space-y-4">
                  <Field
                    label="Company / Organization" name="company"
                    value={form.company} onChange={handle}
                    placeholder="FabricHouse Textiles"
                    Icon={Building2}
                    hint="You can create or join a company later from settings."
                  />
                  <Field
                    label="Phone Number" name="phone"
                    value={form.phone} onChange={handle}
                    placeholder="+91 98765 43210"
                    Icon={Phone}
                  />
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* ─ Terms ─ */}
              <div>
                <label
                  onClick={() => setAgreed((p) => !p)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all
                    ${agreed
                      ? 'border-violet-200 bg-violet-50'
                      : errors.terms
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50 hover:border-violet-200 hover:bg-violet-50/40'}`}
                >
                  <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${agreed ? 'bg-violet-600 border-violet-600' : errors.terms ? 'border-red-400' : 'border-gray-300'}`}>
                    {agreed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed select-none">
                    I agree to StitchFlow's{' '}
                    <a href="#" className="font-bold text-violet-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="font-bold text-violet-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}>Privacy Policy</a>
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.terms}</p>
                )}
              </div>

              {/* ─ Submit ─ */}
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
                  hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold
                  shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                  transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                  flex items-center justify-center gap-2
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <>
                    <span>Create My StitchFlow Account</span>
                    <ArrowRight className="w-4 h-4"/>
                  </>
                )}
              </button>

              {/* perks */}
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-3.5">
                <p className="text-xs font-black text-violet-700 mb-2">🎉 You'll get instant access to:</p>
                <div className="space-y-1">
                  {[
                    'Grey Cloth Estimation module (unlimited)',
                    'Yarn library with full specification support',
                    'Estimate history, versioning & comparison',
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-violet-500 flex-shrink-0"/>
                      <span className="text-xs text-violet-700 font-semibold">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login"
              className="font-bold text-violet-600 hover:text-violet-700 transition-colors">
              Sign in instead →
            </Link>
          </p>

          <div className="mt-5 flex items-center justify-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5"/> SSL Secured
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300"/>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5"/> GDPR Compliant
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;