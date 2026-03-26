import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineArrowUpTray, HiOutlineUserGroup } from 'react-icons/hi2';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal, Input, Textarea, EmptyState, Spinner } from '../components/UI';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', city: '', ntn: '', notes: '' });

  const fetchClients = async () => {
    setLoading(true);
    try { const res = await api.get('/clients'); setClients(res.data); }
    catch { toast.error('Failed to fetch clients'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Client name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
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
    setForm({ name: '', email: '', phone: '', company: '', address: '', city: '', ntn: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (client) => {
    setEditing(client);
    setErrors({});
    setForm({
      name: client.name, email: client.email || '', phone: client.phone || '',
      company: client.company || '', address: client.address || '', city: client.city || '',
      ntn: client.ntn || '', notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, form);
        toast.success('Client updated');
      } else {
        await api.post('/clients', form);
        toast.success('Client added');
      }
      setShowModal(false);
      fetchClients();
    } catch { toast.error('Failed to save client'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    try { await api.delete(`/clients/${id}`); toast.success('Client deleted'); fetchClients(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const importClients = lines.slice(1).map((line) => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i]?.trim(); });
      return obj;
    });
    try {
      await api.post('/clients/import', { clients: importClients });
      toast.success(`Imported ${importClients.length} clients`);
      fetchClients();
    } catch { toast.error('Failed to import'); }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Clients" subtitle={`${clients.length} clients`}>
        <label>
          <Button variant="secondary" as="span">
            <HiOutlineArrowUpTray className="w-4 h-4" /> Import CSV
          </Button>
          <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
        </label>
        <Button onClick={openNew}>
          <HiOutlinePlus className="w-4 h-4" /> Add Client
        </Button>
      </PageHeader>

      {loading ? (
        <Card><Spinner /></Card>
      ) : clients.length === 0 ? (
        <Card>
          <EmptyState icon={HiOutlineUserGroup} title="No clients yet" subtitle="Add clients to start creating invoices" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client, i) => (
            <Card key={client.id} delay={i * 0.03} hover>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-indigo-200">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(client)} className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-500">
                      <HiOutlinePencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-500">
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                {client.company && <p className="text-xs text-slate-500 mt-0.5">{client.company}</p>}
                {client.email && <p className="text-xs text-slate-400 mt-1">{client.email}</p>}
                {client.phone && <p className="text-xs text-slate-400">{client.phone}</p>}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{client._count?.invoices || 0} invoices</span>
                  {client._count?.invoices > 0 && (
                    <Link to={`/clients/${client.id}/statement`} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium">
                      Statement
                    </Link>
                  )}
                  {client.city && <span className="text-[11px] text-slate-400">{client.city}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setField('name', e.target.value)}
            error={errors.name} placeholder="Client name" />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
              error={errors.email} placeholder="email@example.com" />
            <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)}
              placeholder="Phone number" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Company" value={form.company} onChange={(e) => setField('company', e.target.value)}
              placeholder="Company name" />
            <Input label="NTN" value={form.ntn} onChange={(e) => setField('ntn', e.target.value)}
              placeholder="FBR NTN" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setField('city', e.target.value)}
              placeholder="City" />
            <Input label="Address" value={form.address} onChange={(e) => setField('address', e.target.value)}
              placeholder="Address" />
          </div>

          <Textarea label="Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)}
            rows={2} placeholder="Optional notes..." />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving...' : editing ? 'Update Client' : 'Add Client'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
