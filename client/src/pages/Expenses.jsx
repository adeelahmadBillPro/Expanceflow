import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineFunnel, HiOutlineMagnifyingGlass, HiOutlineCurrencyDollar, HiOutlineArrowDownTray, HiOutlineCamera, HiOutlinePhoto } from 'react-icons/hi2';
import ReceiptScanner from '../components/ReceiptScanner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../lib/api';
import { formatCurrency, formatDate, paymentMethods, preventNegativeInput } from '../lib/utils';
import { PageHeader, Card, Button, Modal, Input, Select, Textarea, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [filters, setFilters] = useState({ category: '', startDate: '', endDate: '', paymentMethod: '', search: '' });
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    categoryId: '', amount: '', description: '', notes: '', date: new Date(), paymentMethod: 'CASH', receipt: null,
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/expenses', { params });
      setExpenses(res.data.expenses);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch { toast.error('Failed to fetch expenses'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.filter((c) => c.type === 'EXPENSE')));
  }, []);
  useEffect(() => { fetchExpenses(); }, [page, filters]);

  const validate = () => {
    const e = {};
    if (!form.categoryId) e.categoryId = 'Select a category';
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) e.amount = 'Enter a positive amount';
    if (!form.date) e.date = 'Select a date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openNew = () => {
    setEditing(null);
    setErrors({});
    setForm({ categoryId: categories[0]?.id || '', amount: '', description: '', notes: '', date: new Date(), paymentMethod: 'CASH', receipt: null });
    setShowModal(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setErrors({});
    setForm({
      categoryId: expense.categoryId, amount: String(expense.amount), description: expense.description || '',
      notes: expense.notes || '', date: new Date(expense.date), paymentMethod: expense.paymentMethod, receipt: null,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('categoryId', form.categoryId);
      formData.append('amount', form.amount);
      formData.append('description', form.description);
      formData.append('notes', form.notes);
      formData.append('date', form.date.toISOString());
      formData.append('paymentMethod', form.paymentMethod);
      if (form.receipt) formData.append('receipt', form.receipt);

      if (editing) {
        await api.put(`/expenses/${editing.id}`, formData);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', formData);
        toast.success('Expense added');
      }
      setShowModal(false);
      fetchExpenses();
    } catch { toast.error('Failed to save expense'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try { await api.delete(`/expenses/${id}`); toast.success('Deleted'); fetchExpenses(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" subtitle={`${total} total transactions`}>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
          <HiOutlineFunnel className="w-4 h-4" /> Filters
        </Button>
        <Button variant="secondary" onClick={async () => {
          try {
            const res = await api.get('/export/expenses', { responseType: 'blob', params: filters });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'expenses.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exported');
          } catch { toast.error('Export failed'); }
        }}>
          <HiOutlineArrowDownTray className="w-4 h-4" /> Export
        </Button>
        <Button variant="secondary" onClick={() => setShowReceiptScanner(true)}>
          <HiOutlineCamera className="w-4 h-4" /> Scan Receipt
        </Button>
        <Button onClick={openNew}>
          <HiOutlinePlus className="w-4 h-4" /> Add Expense
        </Button>
      </PageHeader>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search..." value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
                </div>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500">
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <select value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                  className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500">
                  <option value="">All Methods</option>
                  {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <DatePicker selected={filters.startDate ? new Date(filters.startDate) : null}
                  onChange={(d) => setFilters({ ...filters, startDate: d ? d.toISOString().split('T')[0] : '' })}
                  placeholderText="From date" isClearable showPopperArrow={false} />
                <DatePicker selected={filters.endDate ? new Date(filters.endDate) : null}
                  onChange={(d) => setFilters({ ...filters, endDate: d ? d.toISOString().split('T')[0] : '' })}
                  placeholderText="To date" isClearable showPopperArrow={false} />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      <Card>
        {loading ? <Spinner /> : expenses.length === 0 ? (
          <EmptyState icon={HiOutlineCurrencyDollar} title="No expenses found" subtitle="Start by adding your first expense" />
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((expense, i) => (
              <motion.div key={expense.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: expense.category?.color + '18' }}>
                    {expense.category?.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{expense.description || expense.category?.name}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatDate(expense.date)}</span>
                      <span className="text-slate-300">|</span>
                      <span>{paymentMethods.find((m) => m.value === expense.paymentMethod)?.label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(expense.amount)}</p>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(expense)} className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-500">
                      <HiOutlinePencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(expense.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-500">
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                    {expense.receiptUrl && (
                      <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-50 rounded-md text-blue-500" title="View Receipt">
                        <HiOutlinePhoto className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 px-5 py-3 border-t border-slate-100">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-md text-xs font-medium transition-all ${page === i + 1 ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Category *" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} error={errors.categoryId}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (PKR) *" type="number" step="0.01" min="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} onKeyDown={preventNegativeInput} error={errors.amount} placeholder="0" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
              <DatePicker selected={form.date} onChange={(d) => setForm({ ...form, date: d })} dateFormat="dd MMM yyyy" showPopperArrow={false} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
          </div>

          <Input label="Description" type="text" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" />

          <Select label="Payment Method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Receipt</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, receipt: e.target.files[0] })}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-medium file:text-xs file:cursor-pointer" />
          </div>

          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes..." />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving...' : editing ? 'Update Expense' : 'Add Expense'}
          </Button>
        </form>
      </Modal>

      {/* Receipt Scanner */}
      <ReceiptScanner
        open={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onExtract={(data) => {
          setForm({
            ...form,
            amount: data.amount || '',
            date: data.date || new Date(),
            description: data.description || '',
          });
          setShowReceiptScanner(false);
          setShowModal(true);
          toast.success('Receipt data extracted! Review and save.');
        }}
      />
    </div>
  );
}
