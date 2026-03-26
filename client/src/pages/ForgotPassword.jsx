import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineDevicePhoneMobile, HiOutlineKey, HiOutlineCheckCircle } from 'react-icons/hi2';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = enter email/phone, 2 = enter code + new password, 3 = success
  const [method, setMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateStep1 = () => {
    const e = {};
    if (!identifier.trim()) {
      e.identifier = method === 'email' ? 'Email is required' : 'Phone number is required';
    } else if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      e.identifier = 'Invalid email format';
    } else if (method === 'phone' && !/^(\+92|0)?3[0-9]{9}$/.test(identifier.replace(/[\s-]/g, ''))) {
      e.identifier = 'Invalid phone (e.g. 03001234567)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!code.trim()) e.code = 'Code is required';
    else if (!/^\d{6}$/.test(code.trim())) e.code = 'Code must be 6 digits';
    if (!newPassword) e.newPassword = 'Password is required';
    else if (newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setLoading(true);
    try {
      const payload = method === 'email' ? { email: identifier } : { phone: identifier };
      await api.post('/auth/forgot-password', payload);
      toast.success('Reset code sent!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: code.trim(), newPassword });
      toast.success('Password reset successfully!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
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
            Reset your password
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Don't worry, it happens to everyone. We'll help you get back into your account in no time.
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

          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Forgot password?</h2>
              <p className="text-sm text-slate-500 mb-6">Enter your email or phone to receive a reset code</p>

              {/* Method toggle */}
              <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
                <button type="button" onClick={() => { setMethod('email'); setIdentifier(''); setErrors({}); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${method === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                  Email
                </button>
                <button type="button" onClick={() => { setMethod('phone'); setIdentifier(''); setErrors({}); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${method === 'phone' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                  Phone
                </button>
              </div>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {method === 'email' ? 'Email' : 'Phone Number'}
                  </label>
                  <div className="relative">
                    {method === 'email'
                      ? <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      : <HiOutlineDevicePhoneMobile className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    }
                    <input
                      type={method === 'email' ? 'email' : 'tel'}
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setErrors({}); }}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.identifier ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                      placeholder={method === 'email' ? 'you@example.com' : '03001234567'}
                    />
                  </div>
                  {errors.identifier && <p className="text-xs text-red-500 mt-1">{errors.identifier}</p>}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 mt-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : 'Send Reset Code'}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Enter reset code</h2>
              <p className="text-sm text-slate-500 mb-6">
                We sent a 6-digit code to your {method}. Enter it below with your new password.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Reset Code</label>
                  <div className="relative">
                    <HiOutlineKey className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors({}); }}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all tracking-widest font-mono ${errors.code ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setErrors({}); }}
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.newPassword ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                      placeholder="Min 6 characters"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 p-0.5 rounded transition-colors">
                      {showPass ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                      placeholder="Re-enter your password"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 mt-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting...
                    </span>
                  ) : 'Reset Password'}
                </button>

                <button type="button" onClick={() => { setStep(1); setCode(''); setNewPassword(''); setConfirmPassword(''); setErrors({}); }}
                  className="w-full text-center text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  Back to previous step
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <HiOutlineCheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Password reset!</h2>
              <p className="text-sm text-slate-500 mb-6">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Link to="/login"
                className="inline-block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all text-center">
                Back to Sign In
              </Link>
            </div>
          )}

          {step !== 3 && (
            <p className="text-center text-sm text-slate-500 mt-6">
              Remember your password?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">Sign in</Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
