import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineChevronDown, HiOutlineCheckCircle } from 'react-icons/hi2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Page Header
export function PageHeader({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </motion.div>
  );
}

// Card
export function Card({ children, className = '', delay = 0, hover = false, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={hover ? { y: -2, transition: { duration: 0.15 } } : undefined}
      className={`bg-white rounded-xl border border-slate-200/60 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stat Card
export function StatCard({ label, value, icon: Icon, color = 'indigo', delay = 0 }) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
    amber: 'from-amber-500 to-amber-600 shadow-amber-200',
    rose: 'from-rose-500 to-rose-600 shadow-rose-200',
    violet: 'from-violet-500 to-violet-600 shadow-violet-200',
  };
  return (
    <Card delay={delay} hover>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
        <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
      </div>
    </Card>
  );
}

// Button
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 disabled:opacity-50';
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    ghost: 'hover:bg-slate-100 text-slate-600',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  };
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-sm px-5 py-3',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Input
export function Input({ label, error, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm outline-none transition-all duration-150
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'
          }`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Select (native but styled)
export function Select({ label, error, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        <select
          className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm outline-none transition-all duration-150 appearance-none cursor-pointer
            ${error ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50'}`}
          {...props}
        >
          {children}
        </select>
        <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Custom Dropdown (searchable, modern)
export function Dropdown({ label, error, value, onChange, options = [], placeholder = 'Select...', searchable = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? options.filter((o) => (o.label || o.name || '').toLowerCase().includes(search.toLowerCase()))
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-left outline-none transition-all duration-150 flex items-center justify-between
          ${open ? 'border-indigo-500 ring-2 ring-indigo-50' : error ? 'border-red-300' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon && <span>{selected.icon}</span>}
              {selected.label || selected.name}
            </span>
          ) : placeholder}
        </span>
        <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-xl shadow-slate-200/50 max-h-60 overflow-hidden"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-400"
                  autoFocus
                />
              </div>
            )}
            <div className="overflow-y-auto max-h-48 p-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">No results</p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { onChange(option.value); setOpen(false); setSearch(''); }}
                    className={`w-full px-3 py-2 text-sm text-left rounded-md flex items-center gap-2 transition-colors
                      ${option.value === value
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {option.icon && <span className="text-base">{option.icon}</span>}
                    <span className="truncate">{option.label || option.name}</span>
                    {option.value === value && <HiOutlineCheckCircle className="w-4 h-4 text-indigo-500 ml-auto shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// DateField with modern calendar
export function DateField({ label, selected, onChange, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <DatePicker
        selected={selected}
        onChange={onChange}
        dateFormat="dd MMM yyyy"
        showPopperArrow={false}
        {...props}
      />
    </div>
  );
}

// Textarea
export function Textarea({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <textarea
        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 resize-none"
        {...props}
      />
    </div>
  );
}

// Badge
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

// Modal
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Empty State
export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
      {Icon && <Icon className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
      <p className="text-base font-medium text-slate-400">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

// Spinner
export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-[3px] border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
