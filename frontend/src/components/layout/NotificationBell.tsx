import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  eventId?: string;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white transition-colors hover:bg-ink-50 dark:border-ink-dark-border dark:bg-ink-dark-surface dark:hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-ink-200 bg-white shadow-lg dark:border-ink-dark-border dark:bg-ink-dark-surface">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3 dark:border-ink-dark-border">
            <span className="font-semibold text-ink-900 dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-400">No notifications yet</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => { if (n.eventId) { navigate('/events'); setOpen(false); } }}
                  className={`cursor-pointer border-b border-ink-100 px-4 py-3 transition-colors hover:bg-ink-50 dark:border-ink-dark-border dark:hover:bg-white/5 ${!n.isRead ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink-900 dark:text-white">{n.title}</p>
                      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{n.message}</p>
                      <p className="mt-1 text-[10px] text-ink-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
