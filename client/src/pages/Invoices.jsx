import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineEye, HiOutlineTrash, HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineArrowDownTray } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency, formatDate, invoiceStatuses, paymentMethods, preventNegativeInput } from '../lib/utils';
import { PageHeader, Card, Button, Modal, Input, Select, Badge, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'CASH', reference: '', notes: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/invoices', { params });
      setInvoices(res.data.invoices);
    } catch { toast.error('Failed to fetch invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try { await api.delete(`/invoices/${id}`); toast.success('Deleted'); fetchInvoices(); }
    catch { toast.error('Failed to delete'); }
  };

  const openPayment = (inv) => {
    setSelectedInvoice(inv);
    setPaymentForm({ amount: String(Number(inv.grandTotal) - Number(inv.amountPaid)), method: 'CASH', reference: '', notes: '' });
    setErrors({});
    setShowPaymentModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!paymentForm.amount || isNaN(parseFloat(paymentForm.amount)) || parseFloat(paymentForm.amount) <= 0) errs.amount = 'Enter a positive amount';
    if (parseFloat(paymentForm.amount) > Number(selectedInvoice.grandTotal) - Number(selectedInvoice.amountPaid)) errs.amount = 'Amount exceeds balance';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await api.post('/payments', { invoiceId: selectedInvoice.id, ...paymentForm });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      fetchInvoices();
    } catch { toast.error('Failed to record payment'); }
  };

  const shareWhatsApp = (inv) => {
    const text = `Invoice ${inv.invoiceNumber} - ${formatCurrency(inv.grandTotal)} - Due: ${formatDate(inv.dueDate)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const statusColorMap = { DRAFT: 'gray', SENT: 'blue', PAID: 'green', OVERDUE: 'red', CANCELLED: 'amber' };

  return (
    <div className="space-y-4">
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoices`}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
          <option value="">All Status</option>
          {invoiceStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Button variant="secondary" onClick={async () => {
          try {
            const res = await api.get('/export/invoices', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'invoices.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exported');
          } catch { toast.error('Export failed'); }
        }}>
          <HiOutlineArrowDownTray className="w-4 h-4" /> Export
        </Button>
        <Button onClick={() => navigate('/invoices/new')}>
          <HiOutlinePlus className="w-4 h-4" /> Create Invoice
        </Button>
      </PageHeader>

      <Card>
        {loading ? <Spinner /> : invoices.length === 0 ? (
          <EmptyState icon={HiOutlineDocumentText} title="No invoices yet" subtitle="Create your first invoice" />
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv, i) => (
              <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <span className="text-indigo-600 font-bold text-[11px]">{inv.invoiceNumber?.slice(-3)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{inv.invoiceNumber}</p>
                      <p className="text-[11px] text-slate-400">{inv.client?.name} | {formatDate(inv.issueDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(inv.grandTotal)}</p>
                      {Number(inv.amountPaid) > 0 && Number(inv.amountPaid) < Number(inv.grandTotal) && (
                        <p className="text-[10px] text-emerald-500">Paid: {formatCurrency(inv.amountPaid)}</p>
                      )}
                    </div>
                    <Badge color={statusColorMap[inv.status]}>{inv.status}</Badge>
                    <div className="flex gap-0.5">
                      <button onClick={() => navigate(`/invoices/${inv.id}`)} className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-500" title="View">
                        <HiOutlineEye className="w-3.5 h-3.5" />
                      </button>
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <button onClick={() => openPayment(inv)} className="p-1.5 hover:bg-emerald-50 rounded-md text-emerald-500" title="Pay">
                          <HiOutlineBanknotes className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => shareWhatsApp(inv)} className="p-1.5 hover:bg-green-50 rounded-md text-green-600 text-xs" title="WhatsApp">
                        WA
                      </button>
                      <button onClick={() => handleDelete(inv.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-500" title="Delete">
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" maxWidth="max-w-md">
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="text-slate-500">Invoice: <span className="font-semibold text-slate-700">{selectedInvoice?.invoiceNumber}</span></p>
            <p className="text-slate-500">Balance: <span className="font-bold text-slate-800">{formatCurrency(Number(selectedInvoice?.grandTotal) - Number(selectedInvoice?.amountPaid))}</span></p>
          </div>
          <Input label="Amount (PKR) *" type="number" step="0.01" min="0.01" value={paymentForm.amount}
            onChange={(e) => { setPaymentForm({ ...paymentForm, amount: e.target.value }); setErrors({}); }} onKeyDown={preventNegativeInput} error={errors.amount} />
          <Select label="Payment Method" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
            {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          <Input label="Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Transaction ID" />
          <Button type="submit" variant="success" className="w-full">Record Payment</Button>
        </form>
      </Modal>
    </div>
  );
}
