import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCube } from 'react-icons/hi2';
import api from '../lib/api';
import { formatCurrency, preventNegativeInput } from '../lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal, Input, Textarea, EmptyState, Spinner, Badge } from '../components/UI';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: 'piece', taxRate: '17' });

  const fetchProducts = async () => {
    setLoading(true);
    try { const res = await api.get('/products'); setProducts(res.data); }
    catch { toast.error('Failed to fetch products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) e.price = 'Price must be zero or positive';
    if (!form.unit.trim()) e.unit = 'Unit is required';
    if (form.taxRate !== '' && (isNaN(parseFloat(form.taxRate)) || parseFloat(form.taxRate) < 0 || parseFloat(form.taxRate) > 100)) e.taxRate = 'Tax rate must be 0-100';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const openNew = () => {
    setEditing(null);
    setErrors({});
    setForm({ name: '', description: '', price: '', unit: 'piece', taxRate: '17' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setErrors({});
    setForm({ name: p.name, description: p.description || '', price: String(p.price), unit: p.unit, taxRate: String(p.taxRate) });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/products', form);
        toast.success('Product added');
      }
      setShowModal(false);
      fetchProducts();
    } catch { toast.error('Failed to save product'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Product deleted'); fetchProducts(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Products & Services" subtitle={`${products.length} items in catalog`}>
        <Button onClick={openNew}>
          <HiOutlinePlus className="w-4 h-4" /> Add Product
        </Button>
      </PageHeader>

      <Card>
        {loading ? <Spinner /> : products.length === 0 ? (
          <EmptyState icon={HiOutlineCube} title="No products yet" subtitle="Add products to use in invoices" />
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-6 gap-4 px-5 py-2.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-2">Product</div>
              <div>Price</div>
              <div>Unit</div>
              <div>Tax Rate</div>
              <div>Actions</div>
            </div>

            <div className="divide-y divide-slate-100">
              {products.map((product, i) => (
                <motion.div key={product.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-4 px-5 py-3.5 lg:items-center hover:bg-slate-50/60 transition-colors group"
                >
                  <div className="col-span-2 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{product.name}</p>
                    {product.description && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{product.description}</p>}
                  </div>
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(product.price)}</p>
                  <p className="text-sm text-slate-500">{product.unit}</p>
                  <div><Badge color="blue">{product.taxRate}%</Badge></div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-500">
                      <HiOutlinePencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-500">
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setField('name', e.target.value)}
            error={errors.name} placeholder="Product or service name" />

          <Textarea label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)}
            rows={2} placeholder="Optional description..." />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Price (PKR) *" type="number" step="0.01" min="0" value={form.price}
              onChange={(e) => setField('price', e.target.value)} onKeyDown={preventNegativeInput} error={errors.price} placeholder="0" />
            <Input label="Unit *" value={form.unit} onChange={(e) => setField('unit', e.target.value)}
              error={errors.unit} placeholder="piece, hour, kg" />
            <Input label="Tax Rate (%)" type="number" step="0.01" min="0" value={form.taxRate}
              onChange={(e) => setField('taxRate', e.target.value)} onKeyDown={preventNegativeInput} error={errors.taxRate} placeholder="17" />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving...' : editing ? 'Update Product' : 'Add Product'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
