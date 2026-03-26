import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineBell,
  HiOutlineExclamationTriangle,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import api from '../lib/api';
import { PageHeader, Card, Button, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

const typeConfig = {
  budget_warning: {
    icon: HiOutlineExclamationTriangle,
    bg: 'bg-amber-100',
    text: 'text-amber-600',
  },
  invoice_overdue: {
    icon: HiOutlineClock,
    bg: 'bg-red-100',
    text: 'text-red-600',
  },
  payment_received: {
    icon: HiOutlineCurrencyDollar,
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
  },
  team: {
    icon: HiOutlineUserGroup,
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
  },
};

const defaultTypeConfig = {
  icon: HiOutlineBell,
  bg: 'bg-slate-100',
  text: 'text-slate-500',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            <HiOutlineCheckCircle className="w-4 h-4" /> Mark All Read
          </Button>
        )}
      </PageHeader>

      <Card>
        {loading ? (
          <Spinner />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={HiOutlineBell}
            title="No notifications yet"
            subtitle="You'll see notifications about budgets, invoices, and team activity here"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif, i) => {
              const config = typeConfig[notif.type] || defaultTypeConfig;
              const Icon = config.icon;

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`flex items-start gap-3.5 px-5 py-3.5 transition-colors cursor-pointer hover:bg-slate-50/60 ${
                    !notif.isRead ? 'border-l-[3px] border-l-indigo-500 bg-indigo-50/30' : 'border-l-[3px] border-l-transparent'
                  }`}
                >
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                    <Icon className={`w-4.5 h-4.5 ${config.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notif.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{notif.message}</p>
                    <span className="text-[11px] text-slate-400 mt-1 inline-block">{timeAgo(notif.createdAt)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
