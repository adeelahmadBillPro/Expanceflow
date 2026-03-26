import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome, HiOutlineCurrencyDollar, HiOutlineChartBar,
  HiOutlineDocumentText, HiOutlineUsers, HiOutlineCube,
  HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle,
  HiOutlineBars3, HiOutlineBuildingOffice2, HiOutlineShieldCheck,
  HiOutlineCreditCard, HiOutlineBookOpen,
  HiOutlineTag, HiOutlineClipboardDocumentList, HiOutlineBellAlert,
  HiOutlineSun, HiOutlineMoon, HiOutlineArrowUpTray, HiOutlineServerStack, HiOutlineCamera,
  HiOutlineChartPie,
} from 'react-icons/hi2';
import GlobalSearch from './GlobalSearch';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    setIsDark(saved);
    if (saved) document.documentElement.classList.add('dark');
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('darkMode', String(next));
  };

  const teamRole = user?.teamRole;

  // Build nav based on team role
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  ];

  // Cashier+ can see expenses
  if (['OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'].includes(teamRole)) {
    navItems.push(
      { path: '/expenses', label: 'Expenses', icon: HiOutlineCurrencyDollar },
      { path: '/categories', label: 'Categories', icon: HiOutlineTag },
    );
  }
  // Accountant+ can see budgets, invoices, clients, products
  if (['OWNER', 'MANAGER', 'ACCOUNTANT'].includes(teamRole)) {
    navItems.push(
      { path: '/budgets', label: 'Budgets', icon: HiOutlineChartBar },
      { path: '/invoices', label: 'Invoices', icon: HiOutlineDocumentText },
      { path: '/clients', label: 'Clients', icon: HiOutlineUsers },
      { path: '/products', label: 'Products', icon: HiOutlineCube },
      { path: '/reports', label: 'Reports', icon: HiOutlineChartPie },
      { path: '/import', label: 'Import Data', icon: HiOutlineArrowUpTray },
      { path: '/notebook-scanner', label: 'Notebook Scan', icon: HiOutlineCamera },
    );
  }
  // Viewer sees only dashboard (already added above)
  // Owner/Manager can see team, business, billing
  if (['OWNER', 'MANAGER'].includes(teamRole)) {
    navItems.push(
      { path: '/team', label: 'Team', icon: HiOutlineUsers },
      { path: '/business', label: 'Business', icon: HiOutlineBuildingOffice2 },
      { path: '/activity', label: 'Activity Log', icon: HiOutlineClipboardDocumentList },
    );
  }
  if (teamRole === 'OWNER') {
    navItems.push(
      { path: '/billing', label: 'Billing', icon: HiOutlineCreditCard },
      { path: '/backup', label: 'Backup', icon: HiOutlineServerStack },
    );
  }

  navItems.push(
    { path: '/guide', label: 'User Guide', icon: HiOutlineBookOpen },
    { path: '/settings', label: 'Settings', icon: HiOutlineCog6Tooth },
  );

  if (user?.role === 'ADMIN') {
    navItems.push({ path: '/admin', label: 'Admin Panel', icon: HiOutlineShieldCheck });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-[#0f172a] z-50
          transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-extrabold text-sm">EF</span>
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight">{user?.organization?.name || 'ExpenseFlow'}</h1>
            <p className="text-[10px] text-slate-500 font-medium">{teamRole || 'Finance Manager'}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-0.5 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 170px)' }}>
          <p className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Menu</p>
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-400' : ''}`} />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.role === 'ADMIN' ? 'Administrator' : 'Member'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
          >
            <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-[260px] min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 px-4 lg:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <HiOutlineBars3 className="w-5 h-5" />
          </button>

          <div className="hidden lg:block flex-1 max-w-md mx-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button onClick={toggleDark} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              {isDark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
            </button>
            <Link to="/notifications" className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <HiOutlineBellAlert className="w-5 h-5" />
            </Link>
            <span className="hidden sm:block text-[13px] text-slate-500">
              {new Date().toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs lg:hidden">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
