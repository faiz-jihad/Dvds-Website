import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingCart,
  Boxes,
  Mail,
  Info,
  X,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useNotificationStore, AppNotification, NotificationType } from '../../stores/useNotificationStore';
import { cn } from '../../lib/formatters';

export const AdminNotificationMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | NotificationType>('all');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allNotifications = useNotificationStore((state) => state.notifications);
  const notifications = useMemo(
    () => allNotifications.filter((n) => n.target === 'admin'),
    [allNotifications]
  );
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearNotification = useNotificationStore((state) => state.clearNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const permission = useNotificationStore((state) => state.permission);
  const requestPermission = useNotificationStore((state) => state.requestPermission);
  const sendTestNotification = useNotificationStore((state) => state.sendTestNotification);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  const handleItemClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const getItemIcon = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4 text-emerald-600" />;
      case 'stock':
        return <Boxes className="h-4 w-4 text-amber-600" />;
      case 'support':
        return <Mail className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  const getIconContainerClass = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return 'bg-emerald-50 border-emerald-200/60';
      case 'stock':
        return 'bg-amber-50 border-amber-200/60';
      case 'support':
        return 'bg-blue-50 border-blue-200/60';
      default:
        return 'bg-slate-100 border-slate-200/60';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Clean White Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open store notifications"
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150',
          isOpen
            ? 'border-slate-300 bg-slate-100 text-slate-900 shadow-xs'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] rounded-xl border border-slate-200/90 bg-white text-slate-900 shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-slate-900">Store Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200/80">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead('admin')}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearAll('admin')}
                  className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Push Notification Permission Banner */}
          {permission !== 'granted' && (
            <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
                <Radio className="h-3.5 w-3.5 text-blue-600 animate-pulse shrink-0" />
                <span>Enable push notifications for live store alerts</span>
              </div>
              <button
                type="button"
                onClick={() => requestPermission()}
                className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs"
              >
                Enable
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/40 px-3 pt-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'order', label: 'Orders' },
              { key: 'stock', label: 'Inventory' },
              { key: 'support', label: 'Enquiries' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'pb-2 px-3 text-xs font-medium border-b-2 transition-colors -mb-px',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 overscroll-contain">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No notifications in {activeTab !== 'all' ? activeTab : 'inbox'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">New operational activity will appear here in real-time</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    'group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left',
                    notif.read ? 'bg-white hover:bg-slate-50/80' : 'bg-blue-50/30 hover:bg-blue-50/60'
                  )}
                >
                  {/* Icon Indicator */}
                  <div className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs',
                    getIconContainerClass(notif.type)
                  )}>
                    {getItemIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-xs font-bold truncate', notif.read ? 'text-slate-700' : 'text-slate-900')}>
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] leading-relaxed text-slate-600 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                      <span>{formatRelativeTime(notif.createdAt)}</span>
                      {notif.link && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 group-hover:underline inline-flex items-center gap-0.5 font-semibold">
                            View details <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete Item Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notif.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-md"
                    title="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Sync Active</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => sendTestNotification('admin')}
                className="font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                title="Trigger a test alert with sound and toast"
              >
                Test Alert
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/orders');
                }}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                All Orders →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
