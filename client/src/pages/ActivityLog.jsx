import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import api from '../lib/api';
import { PageHeader, Card, Badge, EmptyState, Spinner } from '../components/UI';
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

const actionColors = {
  CREATE: { badge: 'green', dot: 'bg-emerald-500' },
  UPDATE: { badge: 'blue', dot: 'bg-blue-500' },
  DELETE: { badge: 'red', dot: 'bg-red-500' },
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activity', { params: { page, limit: 30 } });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-4">
      <PageHeader title="Activity Log" subtitle="Track all actions in your organization" />

      <Card>
        {loading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={HiOutlineClipboardDocumentList}
            title="No activity yet"
            subtitle="Actions performed in your organization will appear here"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log, i) => {
              const colors = actionColors[log.action] || { badge: 'gray', dot: 'bg-slate-400' };
              const initial = log.userName ? log.userName.charAt(0).toUpperCase() : '?';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} shrink-0`} />
                    {i < logs.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 mt-1" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initial}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-700">{log.userName}</span>
                      <Badge color={colors.badge}>{log.action}</Badge>
                      {log.entity && (
                        <span className="text-xs text-slate-400">{log.entity}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{log.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400">{timeAgo(log.createdAt)}</span>
                      {log.ipAddress && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="text-[11px] text-slate-400">{log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 px-5 py-3 border-t border-slate-100">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-md text-xs font-medium transition-all ${
                  page === i + 1
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
