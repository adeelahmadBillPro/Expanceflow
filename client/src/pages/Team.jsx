import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineNoSymbol, HiOutlineCheckCircle } from 'react-icons/hi2';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import { PageHeader, Card, Button, Modal, Input, Select, Badge, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

const roleLabels = {
  OWNER: { label: 'Owner', color: 'indigo', desc: 'Full access + billing + team management' },
  MANAGER: { label: 'Manager', color: 'violet', desc: 'Full access + team management' },
  ACCOUNTANT: { label: 'Accountant', color: 'blue', desc: 'Expenses, invoices, clients, products' },
  CASHIER: { label: 'Cashier', color: 'amber', desc: 'Add expenses & record payments' },
  VIEWER: { label: 'Viewer', color: 'gray', desc: 'Read-only dashboard' },
};

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [addMethod, setAddMethod] = useState('phone');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', teamRole: 'CASHIER' });

  const fetchMembers = async () => {
    setLoading(true);
    try { const res = await api.get('/team'); setMembers(res.data); }
    catch { toast.error('Failed to fetch team'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (addMethod === 'email') {
      if (!form.email.trim()) e.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    } else {
      if (!form.phone.trim()) e.phone = 'Phone is required';
      else if (!/^(\+92|0)?3[0-9]{9}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Invalid phone (03001234567)';
    }
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/team', {
        name: form.name,
        email: addMethod === 'email' ? form.email : undefined,
        phone: addMethod === 'phone' ? form.phone : undefined,
        password: form.password,
        teamRole: form.teamRole,
      });
      toast.success('Team member added! They can now login.');
      setShowModal(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setSubmitting(false); }
  };

  const changeRole = async (id, teamRole) => {
    try {
      await api.patch(`/team/${id}/role`, { teamRole });
      toast.success('Role updated');
      fetchMembers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleMember = async (id) => {
    try {
      await api.patch(`/team/${id}/toggle`);
      toast.success('Status updated');
      fetchMembers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const removeMember = async (id) => {
    if (!confirm('Remove this team member? They will lose access.')) return;
    try {
      await api.delete(`/team/${id}`);
      toast.success('Member removed');
      fetchMembers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Team" subtitle={`${members.length} members in your organization`}>
        <Button onClick={() => {
          setForm({ name: '', email: '', phone: '', password: '', teamRole: 'CASHIER' });
          setErrors({});
          setShowModal(true);
        }}>
          <HiOutlinePlus className="w-4 h-4" /> Add Employee
        </Button>
      </PageHeader>

      {/* Role Legend */}
      <Card>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Role Permissions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(roleLabels).map(([key, r]) => (
              <div key={key} className="flex items-start gap-2">
                <Badge color={r.color}>{r.label}</Badge>
                <p className="text-[11px] text-slate-400 leading-tight">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Members */}
      <Card>
        {loading ? <Spinner /> : members.length === 0 ? (
          <EmptyState title="No team members" subtitle="Add your first employee" />
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-7 gap-3 px-5 py-2.5 bg-slate-50 rounded-t-xl text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-2">Member</div>
              <div>Contact</div>
              <div>Role</div>
              <div>Status</div>
              <div>Joined</div>
              <div>Actions</div>
            </div>
            <div className="divide-y divide-slate-100">
              {members.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 px-5 py-3.5 lg:items-center hover:bg-slate-50/60 transition-colors">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{m.user.name}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {m.user.email || m.user.phone || '—'}
                  </div>
                  <div>
                    {m.teamRole === 'OWNER' ? (
                      <Badge color={roleLabels[m.teamRole].color}>{roleLabels[m.teamRole].label}</Badge>
                    ) : (
                      <select value={m.teamRole} onChange={(e) => changeRole(m.id, e.target.value)}
                        className="text-[11px] px-2 py-1 border border-slate-200 rounded-md text-slate-600 bg-white appearance-none cursor-pointer">
                        <option value="MANAGER">Manager</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="CASHIER">Cashier</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <Badge color={m.isActive ? 'green' : 'red'}>{m.isActive ? 'Active' : 'Disabled'}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{formatDate(m.joinedAt)}</p>
                  <div className="flex gap-1">
                    {m.teamRole !== 'OWNER' && (
                      <>
                        <button onClick={() => toggleMember(m.id)}
                          className={`p-1.5 rounded-md ${m.isActive ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-green-50 text-green-500'}`}
                          title={m.isActive ? 'Disable' : 'Enable'}>
                          {m.isActive ? <HiOutlineNoSymbol className="w-3.5 h-3.5" /> : <HiOutlineCheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => removeMember(m.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-400" title="Remove">
                          <HiOutlineTrash className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Add Member Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Team Member">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
            This creates a login account for your employee. They'll use the credentials below to sign in.
          </div>

          <Input label="Employee Name *" value={form.name}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({}); }}
            error={errors.name} placeholder="Full name" />

          {/* Contact method toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Method</label>
            <div className="flex bg-slate-100 rounded-lg p-0.5 mb-2">
              <button type="button" onClick={() => setAddMethod('phone')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${addMethod === 'phone' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                Phone
              </button>
              <button type="button" onClick={() => setAddMethod('email')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${addMethod === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                Email
              </button>
            </div>
            {addMethod === 'phone' ? (
              <Input type="tel" value={form.phone}
                onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({}); }}
                error={errors.phone} placeholder="03001234567" />
            ) : (
              <Input type="email" value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({}); }}
                error={errors.email} placeholder="employee@example.com" />
            )}
          </div>

          <Input label="Password *" type="password" value={form.password}
            onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({}); }}
            error={errors.password} placeholder="Login password for employee" />

          <Select label="Role *" value={form.teamRole} onChange={(e) => setForm({ ...form, teamRole: e.target.value })}>
            <option value="CASHIER">Cashier — Add expenses & payments</option>
            <option value="ACCOUNTANT">Accountant — Full finance access</option>
            <option value="MANAGER">Manager — Full access + team</option>
            <option value="VIEWER">Viewer — Read-only</option>
          </Select>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Adding...' : 'Add Team Member'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
