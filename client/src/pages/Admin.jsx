import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineUsers, HiOutlineDocumentText, HiOutlineCurrencyDollar, HiOutlineShieldCheck, HiOutlineTrash, HiOutlineNoSymbol, HiOutlineCheckCircle } from 'react-icons/hi2';
import api from '../lib/api';
import { PageHeader, Card, StatCard, Button, Badge, Spinner } from '../components/UI';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [planRequests, setPlanRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, requestsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/plan-requests?status=PENDING'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setPlanRequests(requestsRes.data);
    } catch (err) {
      toast.error('Admin access required');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const approveRequest = async (id) => {
    const months = window.prompt('How many months to activate?', '1');
    if (!months) return;
    try {
      await api.patch(`/admin/plan-requests/${id}/approve`, { durationMonths: parseInt(months) });
      toast.success('Plan approved and activated!');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const rejectRequest = async (id) => {
    const note = window.prompt('Reason for rejection (optional):');
    try {
      await api.patch(`/admin/plan-requests/${id}/reject`, { adminNote: note || undefined });
      toast.success('Request rejected');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const toggleUser = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/toggle`);
      toast.success('User status updated');
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      toast.success('Role updated');
      fetchData();
    } catch { toast.error('Failed to update role'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Permanently delete this user and all their data?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div><PageHeader title="Admin Panel" subtitle="System overview and user management" /><Spinner /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Admin Panel" subtitle="System overview and user management" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={HiOutlineUsers} color="indigo" delay={0} />
        <StatCard label="Active Users" value={stats?.activeUsers || 0} icon={HiOutlineCheckCircle} color="emerald" delay={0.05} />
        <StatCard label="Total Expenses" value={stats?.totalExpenses || 0} icon={HiOutlineCurrencyDollar} color="amber" delay={0.1} />
        <StatCard label="Total Invoices" value={stats?.totalInvoices || 0} icon={HiOutlineDocumentText} color="violet" delay={0.15} />
      </div>

      {/* Users Table */}
      <Card delay={0.2}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">All Users ({users.length})</h3>

          {/* Header */}
          <div className="hidden lg:grid grid-cols-8 gap-3 px-4 py-2 bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <div className="col-span-2">User</div>
            <div>Role</div>
            <div>Status</div>
            <div>Expenses</div>
            <div>Invoices</div>
            <div>Joined</div>
            <div>Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {users.map((user, i) => (
              <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="grid grid-cols-1 lg:grid-cols-8 gap-2 lg:gap-3 px-4 py-3 lg:items-center hover:bg-slate-50/60 transition-colors">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div>
                  <Badge color={user.role === 'ADMIN' ? 'indigo' : 'gray'}>{user.role}</Badge>
                </div>
                <div>
                  <Badge color={user.isActive ? 'green' : 'red'}>{user.isActive ? 'Active' : 'Disabled'}</Badge>
                </div>
                <p className="text-sm text-slate-600">{user._count?.expenses || 0}</p>
                <p className="text-sm text-slate-600">{user._count?.invoices || 0}</p>
                <p className="text-xs text-slate-400">{formatDate(user.createdAt)}</p>
                <div className="flex gap-1">
                  <button onClick={() => toggleUser(user.id)}
                    className={`p-1.5 rounded-md text-xs ${user.isActive ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-green-50 text-green-500'}`}
                    title={user.isActive ? 'Disable' : 'Enable'}>
                    {user.isActive ? <HiOutlineNoSymbol className="w-3.5 h-3.5" /> : <HiOutlineCheckCircle className="w-3.5 h-3.5" />}
                  </button>
                  <select value={user.role} onChange={(e) => changeRole(user.id, e.target.value)}
                    className="text-[11px] px-1.5 py-1 border border-slate-200 rounded text-slate-600">
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button onClick={() => deleteUser(user.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-400" title="Delete">
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      {/* Plan Requests */}
      {planRequests.length > 0 && (
        <Card delay={0.25}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              Plan Upgrade Requests
              <Badge color="amber">{planRequests.length} pending</Badge>
            </h3>
            <div className="space-y-3">
              {planRequests.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {r.orgName || 'Organization'} — <span className="text-indigo-600">{r.currentPlan} → {r.requestedPlan}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requested by {r.userName} ({r.userEmail || r.userPhone}) on {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="success" size="sm" onClick={() => approveRequest(r.id)}>
                      <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => rejectRequest(r.id)}>
                      <HiOutlineNoSymbol className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
