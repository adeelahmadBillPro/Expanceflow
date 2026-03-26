import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineUsers, HiOutlineCube, HiOutlineCurrencyDollar, HiOutlineDocumentText } from 'react-icons/hi2';
import api from '../lib/api';

const SECTIONS = [
  { key: 'clients', label: 'Clients', icon: HiOutlineUsers, getPath: () => '/clients' },
  { key: 'products', label: 'Products', icon: HiOutlineCube, getPath: () => '/products' },
  { key: 'expenses', label: 'Expenses', icon: HiOutlineCurrencyDollar, getPath: () => '/expenses' },
  { key: 'invoices', label: 'Invoices', icon: HiOutlineDocumentText, getPath: (item) => `/invoices/${item.id}` },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const inputRef = useRef(null);

  // Ctrl+K shortcut and Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  const doSearch = useCallback((q) => {
    if (!q || q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    api.get('/search', { params: { q: q.trim() } })
      .then((res) => {
        setResults(res.data);
        setOpen(true);
      })
      .catch(() => {
        setResults(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (section, item) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    const path = section.getPath(item);
    navigate(path);
  };

  const hasResults = results && SECTIONS.some((s) => results[s.key]?.length > 0);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results && query.trim().length >= 2) setOpen(true); }}
          placeholder="Search expenses, invoices, clients..."
          className="w-[240px] lg:w-[320px] pl-9 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 focus:bg-white"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono hidden sm:block">Ctrl+K</span>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-[320px] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 max-h-[400px] overflow-y-auto z-50"
          >
            {!hasResults ? (
              <p className="text-sm text-slate-400 text-center py-6">No results found</p>
            ) : (
              SECTIONS.map((section) => {
                const items = (results[section.key] || []).slice(0, 3);
                if (items.length === 0) return null;
                const Icon = section.icon;
                return (
                  <div key={section.key}>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{section.label}</span>
                    </div>
                    {items.map((item, i) => (
                      <button
                        key={item.id || i}
                        onClick={() => handleSelect(section, item)}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-3 border-b border-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.name || item.invoiceNumber || item.description || item.title}</p>
                          {item.company && <p className="text-xs text-slate-400 truncate">{item.company}</p>}
                          {item.clientName && <p className="text-xs text-slate-400 truncate">{item.clientName}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
