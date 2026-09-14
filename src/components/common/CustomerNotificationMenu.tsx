import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Package,
  Tag,
  Info,
  X,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useNotificationStore, AppNotification } from '../../stores/useNotificationStore';
import { cn } from '../../lib/formatters';

export const CustomerNotificationMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allNotifications = useNotificationStore((state) => state.notifications);
  const notifications = useMemo(
    () => allNotifications.filter((n) => n.target === 'customer'),
    [allNotifications]
  );
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearNotification = useNotificationStore((state) => state.clearNotification);
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

  const handleItemClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-4 w-4 text-brand-blue" />;
      case 'promo':
        return <Tag className="h-4 w-4 text-emerald-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
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

  return (
    <div className="relative" ref={menuRef}>
      {/* Customer Bell Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Customer notifications"
        className="relative min-h-11 min-w-11 p-2 text-dark hover:text-brand-blue hover:bg-gray-50 rounded-md transition-colors flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Customer Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:-left-32 md:-left-48 mt-2 w-[310px] sm:w-[360px] rounded-xl border border-gray-200 bg-white text-dark shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-dark">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-brand-blue border border-blue-100">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead('customer')}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:text-brand-blue transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Native Push Permission Prompt for Customers */}
          {permission !== 'granted' && (
            <div className="border-b border-blue-100 bg-brand-blue-soft/50 px-4 py-2 flex items-center justify-between gap-3 text-xs text-gray-700">
              <div className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-brand-blue shrink-0 animate-pulse" />
                <span className="text-[11px]">Enable push notifications for live order tracking</span>
              </div>
              <button
                type="button"
                onClick={() => requestPermission()}
                className="shrink-0 rounded bg-brand-blue px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blue-600 transition-colors"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-100 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Bell className="mx-auto h-7 w-7 text-gray-300 mb-2" />
                <p className="text-xs font-medium text-gray-600">No new notifications</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Order updates and special offers will appear here</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    'group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left',
                    notif.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                  )}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 border border-gray-200/60">
                    {getItemIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-xs font-semibold truncate', notif.read ? 'text-gray-700' : 'text-dark font-bold')}>
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-blue shrink-0" />
                      )}
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-gray-600 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{formatRelativeTime(notif.createdAt)}</span>
                      {notif.link && (
                        <>
                          <span>•</span>
                          <span className="text-brand-blue group-hover:underline inline-flex items-center gap-0.5">
                            View <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notif.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity rounded"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-2 text-center text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/account/orders');
              }}
              className="font-medium text-brand-blue hover:underline"
            >
              View My Order History
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
