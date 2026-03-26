import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineQrCode } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../lib/api';
import { formatCurrency, preventNegativeInput } from '../lib/utils';
import { PageHeader, Card, Button, Input, Select, Textarea } from '../components/UI';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';

export default function InvoiceBuilder() {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    clientId: '', issueDate: new Date(), dueDate: new Date(Date.now() + 30 * 86400000),
    discount: '0', discountType: 'FIXED', notes: '', terms: 'Payment due within 30 days.',
  });
  const [items, setItems] = useState([{ name: '', description: '', quantity: '1', unitPrice: '', taxRate: '17', productId: null }]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/clients'), api.get('/products')]).then(([c, p]) => {
      setClients(c.data);
      setProducts(p.data);
    });
  }, []);

  const addItem = () => setItems([...items, { name: '', description: '', quantity: '1', unitPrice: '', taxRate: '17', productId: null }]);
  const removeItem = (i) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));

  const updateItem = (index, field, value) => {
    const u = [...items]; u[index][field] = value; setItems(u);
  };

  const selectProduct = (index, productId) => {
    const p = products.find((p) => p.id === productId);
    if (p) {
      const u = [...items];
      u[index] = { ...u[index], name: p.name, description: p.description || '', unitPrice: String(p.price), taxRate: String(p.taxRate), productId: p.id };
      setItems(u);
    }
  };

  // Barcode lookup — works with physical scanner (keyboard) AND camera
  const lookupBarcode = async (code) => {
    if (!code.trim()) return;
    try {
      const res = await api.get(`/products/barcode/${code.trim()}`);
      const p = res.data;
      setItems([...items, {
        name: p.name, description: p.description || '', quantity: '1',
        unitPrice: String(p.price), taxRate: String(p.taxRate), productId: p.id,
      }]);
      setBarcodeInput('');
      toast.success(`Added: ${p.name}`);
    } catch {
      toast.error('Product not found with this barcode');
      setBarcodeInput('');
    }
  };

  const calcSubtotal = () => items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const calcTax = () => items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0) * ((parseFloat(i.taxRate) || 0) / 100), 0);
  const calcDiscount = () => {
    const d = parseFloat(form.discount) || 0;
    return form.discountType === 'PERCENTAGE' ? (calcSubtotal() * d) / 100 : d;
  };
  const calcTotal = () => calcSubtotal() + calcTax() - calcDiscount();

  const validate = () => {
    const e = {};
    if (!form.clientId) e.clientId = 'Select a client';
    if (!form.issueDate) e.issueDate = 'Select issue date';
    if (!form.dueDate) e.dueDate = 'Select due date';
    if (items.some((i) => !i.name.trim())) e.items = 'All items need a name';
    if (items.some((i) => !i.unitPrice || parseFloat(i.unitPrice) <= 0)) e.items = 'All items need a valid price';
    if (items.some(i => parseFloat(i.unitPrice) < 0)) e.items = 'Prices cannot be negative';
    if (items.some(i => parseFloat(i.quantity) <= 0)) e.items = 'Quantities must be positive';
    if (parseFloat(form.discount) < 0) e.discount = 'Discount cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        issueDate: form.issueDate.toISOString(),
        dueDate: form.dueDate.toISOString(),
        items,
      };
      const res = await api.post('/invoices', payload);
      toast.success('Invoice created!');
      navigate(`/invoices/${res.data.id}`);
    } catch { toast.error('Failed to create invoice'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader title="Create Invoice" subtitle="Build a professional invoice" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Details */}
        <Card delay={0.05}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select label="Client *" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} error={errors.clientId}>
                <option value="">Select client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </Select>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue Date *</label>
                <DatePicker selected={form.issueDate} onChange={(d) => setForm({ ...form, issueDate: d })} dateFormat="dd MMM yyyy" showPopperArrow={false} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date *</label>
                <DatePicker selected={form.dueDate} onChange={(d) => setForm({ ...form, dueDate: d })} dateFormat="dd MMM yyyy" showPopperArrow={false} />
              </div>
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card delay={0.1}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowScanner(true)}>
                  <HiOutlineQrCode className="w-3.5 h-3.5" /> Scan
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                  <HiOutlinePlus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>
            </div>

            {/* Barcode input — physical scanner types here and presses Enter */}
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupBarcode(barcodeInput); } }}
                placeholder="Scan barcode or type barcode number + Enter"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
                autoComplete="off"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => lookupBarcode(barcodeInput)} disabled={!barcodeInput.trim()}>
                Lookup
              </Button>
            </div>
            {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border border-slate-100 rounded-lg p-3.5 hover:border-indigo-200 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">From Catalog</label>
                      <select onChange={(e) => selectProduct(idx, e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs outline-none focus:border-indigo-500">
                        <option value="">Custom item</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Name *</label>
                      <input type="text" value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs outline-none focus:border-indigo-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Qty</label>
                      <input type="number" step="0.01" min="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        onKeyDown={preventNegativeInput} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs outline-none focus:border-indigo-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Price (PKR) *</label>
                      <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        onKeyDown={preventNegativeInput} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs outline-none focus:border-indigo-500" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Tax%</label>
                      <input type="number" min="0" value={item.taxRate} onChange={(e) => updateItem(idx, 'taxRate', e.target.value)}
                        onKeyDown={preventNegativeInput} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-xs outline-none focus:border-indigo-500" />
                    </div>
                    <div className="md:col-span-1 flex items-end gap-1">
                      <p className="text-xs font-semibold text-slate-700 py-2">
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                      </p>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                          <HiOutlineTrash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Notes + Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card delay={0.15}>
            <div className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Notes & Terms</h3>
              <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Additional notes..." />
              <Textarea label="Terms" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={2} />
            </div>
          </Card>

          <Card delay={0.2}>
            <div className="p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Summary</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(calcSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">GST / Tax</span>
                  <span className="font-medium">{formatCurrency(calcTax())}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 shrink-0">Discount</span>
                  <div className="flex-1 flex gap-1.5">
                    <input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      onKeyDown={preventNegativeInput} className="w-20 px-2 py-1 border border-slate-200 rounded text-xs" />
                    <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                      className="px-2 py-1 border border-slate-200 rounded text-xs">
                      <option value="FIXED">PKR</option>
                      <option value="PERCENTAGE">%</option>
                    </select>
                  </div>
                  <span className="font-medium text-sm shrink-0">-{formatCurrency(calcDiscount())}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="text-base font-bold text-slate-800">Grand Total</span>
                  <span className="text-xl font-extrabold text-indigo-600">{formatCurrency(calcTotal())}</span>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full mt-5">
                {submitting ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </Card>
        </div>
      </form>

      {/* Camera Barcode Scanner */}
      <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onScan={lookupBarcode} />
    </div>
  );
}
