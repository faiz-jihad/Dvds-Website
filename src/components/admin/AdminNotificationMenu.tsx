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
        return <ShoppingCart className="h-4 w-4 text-emerald-400" />;
      case 'stock':
        return <Boxes className="h-4 w-4 text-amber-400" />;
      case 'support':
        return <Mail className="h-4 w-4 text-blue-400" />;
      default:
        return <Info className="h-4 w-4 text-slate-300" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open store notifications"
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-150',
          isOpen
            ? 'border-white/25 bg-white/15 text-white'
            : 'border-white/10 bg-white/5 text-neutral-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0d1726]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[410px] rounded-xl border border-neutral-700/80 bg-[#121c2d] text-white shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 bg-[#0c1524] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm tracking-tight text-white">Store Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead('admin')}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearAll('admin')}
                  className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-red-400 transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Push Notification Permission Banner */}
          {permission !== 'granted' && (
            <div className="border-b border-neutral-800 bg-blue-950/40 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-blue-200">
                <Radio className="h-3.5 w-3.5 text-blue-400 animate-pulse shrink-0" />
                <span>Enable push notifications for live orders on desktop</span>
              </div>
              <button
                type="button"
                onClick={() => requestPermission()}
                className="shrink-0 rounded bg-brand-blue px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-600 transition-colors shadow-xs"
              >
                Enable
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex border-b border-neutral-800 bg-[#0f1929] px-3 pt-2">
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
                    ? 'border-brand-blue text-white font-semibold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-800/60 overscroll-contain">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <Bell className="mx-auto h-8 w-8 text-neutral-600 mb-2 opacity-50" />
                <p className="text-xs font-medium">No notifications in {activeTab !== 'all' ? activeTab : 'inbox'}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">New operational activity will appear here in real-time</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    'group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left',
                    notif.read ? 'bg-transparent hover:bg-white/[0.03]' : 'bg-blue-950/25 hover:bg-blue-950/40'
                  )}
                >
                  {/* Icon Indicator */}
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700/60 bg-neutral-800/80 shadow-xs">
                    {getItemIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-xs font-semibold truncate', notif.read ? 'text-neutral-200' : 'text-white')}>
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] leading-relaxed text-neutral-300 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-neutral-400">
                      <span>{formatRelativeTime(notif.createdAt)}</span>
                      {notif.link && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400 group-hover:underline inline-flex items-center gap-0.5">
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-400 transition-opacity rounded"
                    title="Dismiss notification"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-neutral-800 bg-[#0c1524] px-4 py-2.5 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Real-time Service Worker Ready</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/orders');
              }}
              className="font-medium text-brand-blue hover:text-blue-400 hover:underline"
            >
              All Orders →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
