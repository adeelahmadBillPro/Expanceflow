import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineUser, HiOutlineEye, HiOutlineEyeSlash, HiOutlineDevicePhoneMobile } from 'react-icons/hi2';

export default function Register() {
  const [signupMethod, setSignupMethod] = useState('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: async (response) => {
            try {
              await googleLogin({ idToken: response.credential });
              toast.success('Welcome!');
              navigate('/dashboard');
            } catch (err) {
              toast.error(err.response?.data?.error || 'Google login failed');
            }
          },
        });
      }
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (signupMethod === 'email') {
      if (!email.trim()) e.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
    } else {
      if (!phone.trim()) e.phone = 'Phone number is required';
      else if (!/^(\+92|0)?3[0-9]{9}$/.test(phone.replace(/[\s-]/g, ''))) e.phone = 'Invalid phone (e.g. 03001234567)';
    }
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        name,
        email: signupMethod === 'email' ? email : undefined,
        phone: signupMethod === 'phone' ? phone : undefined,
        password,
      });
      toast.success('Account created! Welcome to ExpenseFlow');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
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
            Start your journey to financial clarity
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Create your free account and get started in seconds. No credit card required.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { num: '24+', label: 'Categories' },
              { num: 'PKR', label: 'Currency' },
              { num: '17%', label: 'GST Default' },
              { num: 'Free', label: 'To Start' },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-lg font-bold text-white">{item.num}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">EF</span>
            </div>
            <span className="text-lg font-bold text-slate-800">ExpenseFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Create account</h2>
          <p className="text-sm text-slate-500 mb-6">Fill in the details to get started</p>

          {/* Method toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button type="button" onClick={() => { setSignupMethod('email'); setErrors({}); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${signupMethod === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Email
            </button>
            <button type="button" onClick={() => { setSignupMethod('phone'); setErrors({}); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${signupMethod === 'phone' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors({}); }}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.name ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                  placeholder="Your full name" />
              </div>
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {signupMethod === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.email ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                    placeholder="you@example.com" />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <HiOutlineDevicePhoneMobile className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors({}); }}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.phone ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                    placeholder="03001234567" />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.password ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                  placeholder="Minimum 6 characters" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 p-0.5 rounded transition-colors">
                  {showPass ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-all ${errors.confirmPassword ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
                  placeholder="Re-enter your password" />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          {/* Google */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div id="google-signin-btn" className="flex justify-center">
            <button type="button"
              onClick={() => {
                if (!window.google) {
                  toast.error('Google Sign-In not loaded. Check your internet connection.');
                  return;
                }
                window.google.accounts.id.prompt();
              }}
              className="w-full py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
