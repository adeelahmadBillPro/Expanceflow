import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineTag } from 'react-icons/hi2';
import api from '../lib/api';
import { PageHeader, Card, Button, Modal, Input, Select, Badge, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('EXPENSE');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ name: '', icon: '', color: '#6366f1', type: 'EXPENSE' });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered = categories.filter((c) => c.type === activeTab);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else {
      const duplicate = categories.find(
        (c) => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.type === form.type && (!editing || c.id !== editing.id)
      );
      if (duplicate) e.name = 'Category name already exists';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openNew = () => {
    setEditing(null);
    setErrors({});
    setForm({ name: '', icon: '', color: '#6366f1', type: activeTab });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setErrors({});
    setForm({ name: cat.name, icon: cat.icon || '', color: cat.color || '#6366f1', type: cat.type });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { name: form.name.trim(), icon: form.icon, color: form.color, type: form.type };
      if (editing) {
        await api.put(`/categories/${editing.id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Existing transactions will keep their category.')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const isCustom = (cat) => cat.orgId !== null && cat.orgId !== undefined;

  return (
    <div className="space-y-4">
      <PageHeader title="Categories" subtitle="Manage expense and income categories">
        <Button onClick={openNew}>
          <HiOutlinePlus className="w-4 h-4" /> Add Category
        </Button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
        {['EXPENSE', 'INCOME'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'EXPENSE' ? 'Expense Categories' : 'Income Categories'}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><Spinner /></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={HiOutlineTag} title={`No ${activeTab.toLowerCase()} categories`} subtitle="Create your first custom category" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((cat, i) => (
            <Card key={cat.id} delay={i * 0.03} hover>
              <div className="p-4 group relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: (cat.color || '#6366f1') + '18' }}
                    >
                      {cat.icon || '📁'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{cat.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || '#6366f1' }}
                        />
                        {isCustom(cat) ? (
                          <Badge color="indigo">Custom</Badge>
                        ) : (
                          <Badge color="gray">Default</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {isCustom(cat) && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-500"
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 hover:bg-red-50 rounded-md text-red-500"
                      >
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name *"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Office Supplies"
          />

          <Input
            label="Icon (emoji)"
            type="text"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="e.g. 🏢"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
              />
              <span className="text-sm text-slate-500">{form.color}</span>
            </div>
          </div>

          <Select
            label="Type *"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </Select>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving...' : editing ? 'Update Category' : 'Add Category'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
