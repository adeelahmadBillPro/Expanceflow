import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowDownTray, HiOutlineShieldCheck, HiOutlineClock, HiOutlineServerStack } from 'react-icons/hi2';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import { PageHeader, Card, Button, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

export default function Backup() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/backup/stats').then((res) => setStats(res.data))
      .catch(() => toast.error('Failed to load backup info'))
      .finally(() => setLoading(false));
  }, []);

  const downloadBackup = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/backup/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenseflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded!');
      // Refresh stats to update last backup time
      const statsRes = await api.get('/backup/stats');
      setStats(statsRes.data);
    } catch { toast.error('Backup failed'); }
    finally { setDownloading(false); }
  };

  if (loading) return <div><PageHeader title="Backup" subtitle="Protect your business data" /><Spinner /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageHeader title="Backup" subtitle="Download and protect your business data" />

      {/* Last backup info */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <HiOutlineShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Data Protection</h3>
              {stats?.lastBackupAt ? (
                <p className="text-xs text-slate-500">Last backup: {formatDate(stats.lastBackupAt)}</p>
              ) : (
                <p className="text-xs text-amber-600">No backup created yet — download one now</p>
              )}
            </div>
          </div>

          {/* What will be backed up */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Expenses', count: stats?.counts?.expenses || 0 },
              { label: 'Invoices', count: stats?.counts?.invoices || 0 },
              { label: 'Clients', count: stats?.counts?.clients || 0 },
              { label: 'Products', count: stats?.counts?.products || 0 },
              { label: 'Members', count: stats?.counts?.members || 0 },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-slate-800">{item.count}</p>
                <p className="text-[11px] text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          <Button className="w-full" onClick={downloadBackup} disabled={downloading}>
            {downloading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating backup...
              </span>
            ) : (
              <><HiOutlineArrowDownTray className="w-4 h-4" /> Download Full Backup (JSON)</>
            )}
          </Button>
        </div>
      </Card>

      {/* What's included */}
      <Card delay={0.1}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">What's Included in Backup</h3>
          <div className="space-y-2">
            {[
              { icon: '📊', label: 'All expenses with categories, dates, payment methods' },
              { icon: '📄', label: 'All invoices with line items, payments, status' },
              { icon: '👥', label: 'Client list with contact details and NTN' },
              { icon: '📦', label: 'Product catalog with prices, barcodes, tax rates' },
              { icon: '👨‍💼', label: 'Team members with roles' },
              { icon: '📋', label: 'Budgets and categories' },
              { icon: '🏢', label: 'Business profile, logo, bank details' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 text-sm text-slate-600">
                <span className="text-base">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Tips */}
      <Card delay={0.15}>
        <div className="p-5 bg-indigo-50/50 rounded-xl">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Backup Tips</h3>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li>• Download a backup at least once a week</li>
            <li>• Save backups to Google Drive, USB, or external storage</li>
            <li>• Backup before making major changes (deleting data, removing members)</li>
            <li>• The backup file contains all your data in JSON format</li>
            <li>• Keep multiple backup copies in different locations</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
