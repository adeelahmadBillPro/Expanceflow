import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineChartBar, HiOutlineDocumentArrowDown, HiOutlineBanknotes, HiOutlineReceiptPercent, HiOutlineCurrencyDollar } from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { PageHeader, Card, Select, Spinner, StatCard } from '../components/UI';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'profit-loss', label: 'Profit & Loss' },
  { key: 'gst', label: 'GST Summary' },
  { key: 'expense', label: 'Expense Summary' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('profit-loss');

  return (
    <div>
      <PageHeader title="Financial Reports" subtitle="Analyze your business performance" />

      {/* Tab Toggle */}
      <div className="flex bg-slate-100 rounded-lg p-1 mb-6 max-w-md">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profit-loss' && <ProfitLossTab />}
      {activeTab === 'gst' && <GSTSummaryTab />}
      {activeTab === 'expense' && <ExpenseSummaryTab />}
    </div>
  );
}

function ProfitLossTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const years = [];
  for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/profit-loss', { params: { year } })
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load profit & loss data'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <Spinner />;
  if (!data) return null;

  const months = data.months || [];
  const totals = data.totals || { income: 0, expenses: 0, profit: 0 };

  return (
    <div className="space-y-6">
      <div className="max-w-[180px]">
        <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>

      {/* Chart */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={months} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ fontSize: '13px' }} />
            <Bar dataKey="income" name="Income" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Income</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expenses</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody>
              {months.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-700">{row.month}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(row.income)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(row.expenses)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(row.profit)}
                  </td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-5 py-3 text-slate-800">Total</td>
                <td className="px-5 py-3 text-right text-slate-800">{formatCurrency(totals.income)}</td>
                <td className="px-5 py-3 text-right text-slate-800">{formatCurrency(totals.expenses)}</td>
                <td className={`px-5 py-3 text-right ${totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function GSTSummaryTab() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    api.get('/reports/gst-summary', {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    })
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load GST summary'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const downloadCSV = () => {
    if (!data?.invoices?.length) return;
    const headers = ['Invoice #', 'Date', 'Client', 'Client NTN', 'Subtotal', 'GST Amount', 'Total'];
    const rows = data.invoices.map((inv) => [
      inv.invoiceNumber,
      formatDate(inv.date),
      inv.clientName || '',
      inv.clientNtn || '',
      inv.subtotal,
      inv.gstAmount,
      inv.total,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-summary-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  if (loading) return <Spinner />;

  const summary = data?.summary || { totalSales: 0, totalGst: 0, totalWithGst: 0 };
  const invoices = data?.invoices || [];

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(d) => d && setStartDate(d)}
            dateFormat="dd MMM yyyy"
            showPopperArrow={false}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(d) => d && setEndDate(d)}
            dateFormat="dd MMM yyyy"
            showPopperArrow={false}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          <HiOutlineDocumentArrowDown className="w-4 h-4" />
          Download CSV
        </motion.button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Sales (excl. GST)" value={formatCurrency(summary.totalSales)} icon={HiOutlineBanknotes} color="indigo" delay={0} />
        <StatCard label="Total GST" value={formatCurrency(summary.totalGst)} icon={HiOutlineReceiptPercent} color="amber" delay={0.05} />
        <StatCard label="Total with GST" value={formatCurrency(summary.totalWithGst)} icon={HiOutlineCurrencyDollar} color="emerald" delay={0.1} />
      </div>

      {/* Invoice Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client NTN</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtotal</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Amount</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No invoices found for this period</td></tr>
              ) : (
                invoices.map((inv, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-indigo-600">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3 text-slate-700">{inv.clientName}</td>
                    <td className="px-5 py-3 text-slate-500">{inv.clientNtn || '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(inv.subtotal)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(inv.gstAmount)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(inv.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ExpenseSummaryTab() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/expense-summary', {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    })
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load expense summary'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) return <Spinner />;

  const categories = data?.categories || [];
  const totalAmount = categories.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(d) => d && setStartDate(d)}
            dateFormat="dd MMM yyyy"
            showPopperArrow={false}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(d) => d && setEndDate(d)}
            dateFormat="dd MMM yyyy"
            showPopperArrow={false}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
      </div>

      {/* Chart */}
      {categories.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categories.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={70} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar dataKey="totalAmount" name="Amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Category Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Count</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No expenses found for this period</td></tr>
              ) : (
                categories.map((cat, i) => {
                  const pct = totalAmount > 0 ? ((cat.totalAmount / totalAmount) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {cat.icon && <span className="text-base">{cat.icon}</span>}
                          {cat.color && (
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          )}
                          <span className="font-medium text-slate-700">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(cat.totalAmount)}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{cat.count}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-600 w-12 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
