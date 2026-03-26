import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationTriangle, HiOutlineXMark } from 'react-icons/hi2';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import { PageHeader, Card, Button, Badge, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

const plans = [
  {
    key: 'FREE', name: 'Free', price: '0', period: '',
    features: ['50 expenses/month', '5 invoices/month', '5 clients', '2 team members', 'Basic dashboard'],
    color: 'slate',
  },
  {
    key: 'PRO', name: 'Pro', price: '999', period: '/month',
    features: ['Unlimited expenses', 'Unlimited invoices', '50 clients', '10 team members', 'Custom categories', 'Receipt uploads', 'PDF downloads', 'Email invoices'],
    color: 'indigo', popular: true,
  },
  {
    key: 'BUSINESS', name: 'Business', price: '2,499', period: '/month',
    features: ['Everything in Pro', 'Unlimited clients', 'Unlimited members', 'Recurring invoices', 'CSV import/export', 'Priority support'],
    color: 'violet',
  },
];

export default function Billing() {
  const [planInfo, setPlanInfo] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);

  const fetchPlan = async () => {
    try {
      const [planRes, historyRes] = await Promise.all([
        api.get('/billing/plan'),
        api.get('/billing/requests'),
      ]);
      setPlanInfo(planRes.data);
      setRequestHistory(historyRes.data);
    } catch { toast.error('Failed to load billing info'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlan(); }, []);

  const handleRequestUpgrade = async (plan) => {
    setRequesting(plan);
    try {
      await api.post('/billing/request-upgrade', { plan });
      toast.success('Upgrade request submitted! Admin will review it.');
      fetchPlan();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request upgrade');
    } finally { setRequesting(null); }
  };

  const cancelRequest = async (id) => {
    try {
      await api.delete(`/billing/cancel-request/${id}`);
      toast.success('Request cancelled');
      fetchPlan();
    } catch { toast.error('Failed to cancel'); }
  };

  if (loading) return <div><PageHeader title="Billing" subtitle="Manage your subscription plan" /><Spinner /></div>;

  const statusColors = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Billing" subtitle="Manage your subscription plan" />

      {/* Current Plan */}
      <Card>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-800">Current Plan: {planInfo?.plan}</h3>
                <Badge color={planInfo?.plan === 'FREE' ? 'gray' : planInfo?.plan === 'PRO' ? 'indigo' : 'violet'}>{planInfo?.plan}</Badge>
              </div>
              {planInfo?.isTrialActive && (
                <div className="flex items-center gap-1.5 text-sm text-amber-600 mt-1">
                  <HiOutlineClock className="w-4 h-4" />
                  Free trial: <strong>{planInfo.trialDaysLeft} days</strong> remaining
                </div>
              )}
              {planInfo?.isPlanExpired && (
                <div className="flex items-center gap-1.5 text-sm text-red-600 mt-1">
                  <HiOutlineExclamationTriangle className="w-4 h-4" />
                  Your plan has expired. Request a renewal.
                </div>
              )}
              {planInfo?.planExpiresAt && !planInfo.isPlanExpired && planInfo.plan !== 'FREE' && (
                <p className="text-sm text-slate-500 mt-1">
                  Expires: {new Date(planInfo.planExpiresAt).toLocaleDateString('en-PK', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Pending Request Banner */}
          {planInfo?.pendingRequest && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiOutlineClock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Upgrade to {planInfo.pendingRequest.requestedPlan} — Pending Approval
                  </p>
                  <p className="text-xs text-amber-600">Submitted {formatDate(planInfo.pendingRequest.createdAt)}. Admin will review shortly.</p>
                </div>
              </div>
              <button onClick={() => cancelRequest(planInfo.pendingRequest.id)} className="p-1 hover:bg-amber-100 rounded text-amber-500">
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Usage */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
            {[
              { label: 'Expenses', used: planInfo?.usage?.expenses, limit: planInfo?.limits?.expenses },
              { label: 'Invoices', used: planInfo?.usage?.invoices, limit: planInfo?.limits?.invoices },
              { label: 'Clients', used: planInfo?.usage?.clients, limit: planInfo?.limits?.clients },
              { label: 'Members', used: planInfo?.usage?.members, limit: planInfo?.limits?.members },
            ].map((item) => {
              const unlimited = item.limit === -1;
              const pct = unlimited ? 0 : item.limit > 0 ? (item.used / item.limit) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-700">
                      {item.used}{unlimited ? '' : ` / ${item.limit}`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: unlimited ? '3%' : `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.8 }} className={`h-full rounded-full ${pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                  </div>
                  {unlimited && <p className="text-[10px] text-slate-400 mt-0.5">Unlimited</p>}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, i) => {
          const isCurrent = planInfo?.plan === plan.key;
          const hasPending = planInfo?.pendingRequest?.requestedPlan === plan.key;
          return (
            <Card key={plan.key} delay={i * 0.05} hover>
              <div className={`p-6 relative ${plan.popular ? 'border-2 border-indigo-500 rounded-xl' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                    Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                <div className="mt-2 mb-5">
                  <span className="text-3xl font-extrabold text-slate-800">PKR {plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>Current Plan</Button>
                ) : hasPending ? (
                  <Button variant="secondary" className="w-full" disabled>
                    <HiOutlineClock className="w-4 h-4" /> Pending Approval
                  </Button>
                ) : plan.key === 'FREE' ? (
                  <Button variant="secondary" className="w-full" disabled>Free Plan</Button>
                ) : (
                  <Button
                    variant={plan.popular ? 'primary' : 'secondary'}
                    className="w-full"
                    disabled={requesting === plan.key || !!planInfo?.pendingRequest}
                    onClick={() => handleRequestUpgrade(plan.key)}
                  >
                    {requesting === plan.key ? 'Submitting...' : 'Request Upgrade'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Request History */}
      {requestHistory.length > 0 && (
        <Card delay={0.2}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Request History</h3>
            <div className="space-y-2">
              {requestHistory.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {r.currentPlan} → {r.requestedPlan}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <Badge color={statusColors[r.status]}>{r.status}</Badge>
                    {r.adminNote && <p className="text-[10px] text-slate-400 mt-1">{r.adminNote}</p>}
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
