import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineExclamationTriangle, HiOutlineArrowTrendingUp } from 'react-icons/hi2';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { PageHeader, StatCard, Card, Spinner } from '../components/UI';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [dailyChart, setDailyChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/chart/monthly'),
      api.get('/dashboard/chart/daily'),
    ]).then(([s, m, d]) => {
      setStats(s.data);
      setMonthlyChart(m.data);
      setDailyChart(d.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const statCards = [
    { label: 'Spent This Month', value: formatCurrency(stats?.totalSpentThisMonth || 0), icon: HiOutlineBanknotes, color: 'indigo' },
    { label: 'Total Invoices', value: stats?.totalInvoices || 0, icon: HiOutlineDocumentText, color: 'emerald' },
    { label: 'Unpaid Invoices', value: stats?.unpaidInvoicesCount || 0, icon: HiOutlineExclamationTriangle, color: 'amber' },
    { label: 'Outstanding', value: formatCurrency(stats?.unpaidInvoicesAmount || 0), icon: HiOutlineArrowTrendingUp, color: 'rose' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Your financial overview at a glance" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 0.05} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <Card delay={0.2}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Expenses by Category</h3>
            {stats?.expensesByCategory?.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={stats.expensesByCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%"
                      outerRadius={90} innerRadius={48} paddingAngle={3} strokeWidth={0}>
                      {stats.expensesByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  {stats.expensesByCategory.slice(0, 6).map((cat) => (
                    <div key={cat.category} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-600 truncate flex-1">{cat.category}</span>
                      <span className="text-slate-400 font-medium">{formatCurrency(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">No expenses yet</div>
            )}
          </div>
        </Card>

        {/* Bar */}
        <Card delay={0.25}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Monthly Expenses</h3>
            <ResponsiveContainer width="100%" height={310}>
              <BarChart data={monthlyChart} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Daily trend */}
      <Card delay={0.3}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Daily Spending Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyChart}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#areaFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent */}
      <Card delay={0.35}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Transactions</h3>
          <div className="space-y-1">
            {stats?.recentExpenses?.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: expense.category?.color + '18' }}>
                    {expense.category?.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{expense.description || expense.category?.name}</p>
                    <p className="text-xs text-slate-400">{formatDate(expense.date)}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-800">{formatCurrency(expense.amount)}</p>
              </div>
            ))}
            {(!stats?.recentExpenses || stats.recentExpenses.length === 0) && (
              <p className="text-center text-sm text-slate-400 py-8">No transactions yet</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
