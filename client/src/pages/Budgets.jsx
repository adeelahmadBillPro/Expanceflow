import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineChartBar } from 'react-icons/hi2';
import api from '../lib/api';
import { formatCurrency, preventNegativeInput } from '../lib/utils';
import { PageHeader, Card, Button, Modal, Select, Input, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ categoryId: '', amount: '' });
  const [errors, setErrors] = useState({});

  const fetchBudgets = async () => {
    setLoading(true);
    try { const res = await api.get('/budgets', { params: { month, year } }); setBudgets(res.data); }
    catch { toast.error('Failed to fetch budgets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { api.get('/categories').then((res) => setCategories(res.data.filter((c) => c.type === 'EXPENSE'))); }, []);
  useEffect(() => { fetchBudgets(); }, [month, year]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.categoryId) errs.categoryId = 'Select a category';
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) errs.amount = 'Enter a positive budget amount';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Check for duplicate budget
    const exists = budgets.find((b) => b.categoryId === form.categoryId);
    if (exists) {
      toast.error('Budget already exists for this category. It will be updated.');
    }

    try {
      await api.post('/budgets', { ...form, month, year });
      toast.success('Budget set!');
      setShowModal(false);
      fetchBudgets();
    } catch { toast.error('Failed to set budget'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this budget?')) return;
    await api.delete(`/budgets/${id}`);
    toast.success('Budget removed');
    fetchBudgets();
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-4">
      <PageHeader title="Budgets" subtitle="Set monthly spending limits per category">
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
          {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button onClick={() => { setForm({ categoryId: categories[0]?.id || '', amount: '' }); setErrors({}); setShowModal(true); }}>
          <HiOutlinePlus className="w-4 h-4" /> Set Budget
        </Button>
      </PageHeader>

      {loading ? <Spinner /> : budgets.length === 0 ? (
        <Card>
          <EmptyState icon={HiOutlineChartBar} title={`No budgets for ${monthNames[month - 1]} ${year}`} subtitle="Click 'Set Budget' to start tracking" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget, i) => {
            const pct = budget.percentage;
            const isWarning = pct >= 80 && pct < 100;
            const isOver = pct >= 100;
            const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500';

            return (
              <Card key={budget.id} delay={i * 0.04} hover>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{budget.category?.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{budget.category?.name}</p>
                        <p className="text-[11px] text-slate-400">Monthly Budget</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(budget.id)} className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500">
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{formatCurrency(budget.spent)} spent</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(budget.amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-semibold ${isOver ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-slate-400'}`}>
                        {pct}% used
                      </span>
                      {isOver && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-semibold">OVER BUDGET</span>}
                      {isWarning && !isOver && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-semibold">WARNING</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Set Budget" maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Category *" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} error={errors.categoryId}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
          <Input label="Budget Amount (PKR) *" type="number" min="1" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} onKeyDown={preventNegativeInput} error={errors.amount} placeholder="10000" />
          <Button type="submit" className="w-full">Set Budget</Button>
        </form>
      </Modal>
    </div>
  );
}
