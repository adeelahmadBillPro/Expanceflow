import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlinePrinter, HiOutlineBanknotes, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineDocumentText } from 'react-icons/hi2';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { PageHeader, Card, Button, Badge, Spinner, StatCard } from '../components/UI';
import toast from 'react-hot-toast';

const statusBadge = (status) => {
  const map = {
    DRAFT: { color: 'gray', label: 'Draft' },
    SENT: { color: 'blue', label: 'Sent' },
    PAID: { color: 'green', label: 'Paid' },
    OVERDUE: { color: 'red', label: 'Overdue' },
    CANCELLED: { color: 'amber', label: 'Cancelled' },
    PARTIAL: { color: 'amber', label: 'Partial' },
  };
  const s = map[status] || { color: 'gray', label: status };
  return <Badge color={s.color}>{s.label}</Badge>;
};

export default function ClientStatement() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/clients/${id}/statement`)
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load client statement'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6"><Spinner /></div>;
  if (!data) return null;

  const { client, invoices, summary } = data;

  return (
    <div>
      <PageHeader title="Client Statement" subtitle={`Statement for ${client.name}`}>
        <Link to="/clients">
          <Button variant="secondary" size="sm">
            <HiOutlineArrowLeft className="w-4 h-4" />
            Back to Clients
          </Button>
        </Link>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <HiOutlinePrinter className="w-4 h-4" />
          Print
        </Button>
      </PageHeader>

      {/* Client Info */}
      <Card className="p-5 mb-6">
        <div className="flex flex-wrap gap-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{client.name}</h3>
            {client.company && <p className="text-sm text-slate-500">{client.company}</p>}
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
            {client.email && (
              <div>
                <span className="text-xs text-slate-400 block">Email</span>
                {client.email}
              </div>
            )}
            {client.phone && (
              <div>
                <span className="text-xs text-slate-400 block">Phone</span>
                {client.phone}
              </div>
            )}
            {client.address && (
              <div>
                <span className="text-xs text-slate-400 block">Address</span>
                {client.address}{client.city ? `, ${client.city}` : ''}
              </div>
            )}
            {client.ntn && (
              <div>
                <span className="text-xs text-slate-400 block">NTN</span>
                {client.ntn}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Billed" value={formatCurrency(summary.totalBilled)} icon={HiOutlineDocumentText} color="indigo" delay={0} />
        <StatCard label="Total Paid" value={formatCurrency(summary.totalPaid)} icon={HiOutlineCheckCircle} color="emerald" delay={0.05} />
        <StatCard label="Outstanding" value={formatCurrency(summary.totalOutstanding)} icon={HiOutlineExclamationCircle} color="rose" delay={0.1} />
      </div>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">
            Invoices ({summary.invoiceCount || invoices?.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grand Total</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!invoices || invoices.length === 0) ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No invoices found</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <Link to={`/invoices/${inv.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(inv.grandTotal)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(inv.paidAmount || 0)}</td>
                    <td className="px-5 py-3 text-center">{statusBadge(inv.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
