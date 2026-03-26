import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineDevicePhoneMobile } from 'react-icons/hi2';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!identifier.trim()) {
      e.identifier = loginMethod === 'email' ? 'Email is required' : 'Phone number is required';
    } else if (loginMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      e.identifier = 'Invalid email format';
    } else if (loginMethod === 'phone' && !/^(\+92|0)?3[0-9]{9}$/.test(identifier.replace(/[\s-]/g, ''))) {
      e.identifier = 'Invalid phone (e.g. 03001234567)';
    }
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(identifier, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 px-16 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-extrabold">EF</span>
            </div>
            <span className="text-xl font-bold text-white">ExpenseFlow</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage your finances with confidence
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Track expenses, create professional invoices, and manage budgets — all in one place. Built for Pakistani businesses.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map((l) => (
                <div key={l} className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold border-2 border-[#0f172a]">
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400">Trusted by 500+ businesses</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">EF</span>
            </div>
            <span className="text-lg font-bold text-slate-800">ExpenseFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to access your account</p>

          {/* Login method toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button type="button" onClick={() => { setLoginMethod('email'); setIdentifier(''); setErrors({}); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Email
            </button>
            <button type="button" onClick={() => { setLoginMethod('phone'); setIdentifier(''); setErrors({}); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'phone' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {loginMethod === 'email' ? 'Email' : 'Phone Number'}
              </label>
              <div className="relative">
                {loginMethod === 'email'
                  ? <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  : <HiOutlineDevicePhoneMobile className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                }
                <input
                  type={loginMethod === 'email' ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setErrors({}); }}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.identifier ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                  placeholder={loginMethod === 'email' ? 'you@example.com' : '03001234567'}
                />
              </div>
              {errors.identifier && <p className="text-xs text-red-500 mt-1">{errors.identifier}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.password ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 p-0.5 rounded transition-colors">
                  {showPass ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Forgot Password?</Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google button */}
          <button type="button"
            onClick={() => toast('Google login requires OAuth setup. Go to Settings to configure.', { icon: 'ℹ️' })}
            className="w-full py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold">Create account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
