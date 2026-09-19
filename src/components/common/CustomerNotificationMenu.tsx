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
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

export const CustomerNotificationMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
        return <Tag className="h-4 w-4 text-emerald-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
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
    <div ref={menuRef} className="relative">
      {/* Trigger Button matching Navbar pill design */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Customer notifications"
        aria-expanded={isOpen}
        className={cn(
          'relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer',
          isDark
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
            : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-gray-900 shadow-2xs'
        )}
      >
        <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Customer Notification Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed sm:absolute top-[64px] sm:top-full mt-2 left-3 right-3 sm:left-auto sm:right-0 w-auto sm:w-[360px] rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 max-h-[calc(100vh-90px)] flex flex-col',
            isDark
              ? 'bg-[#0E131F] border-white/15 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between border-b px-4 py-3',
              isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50/80'
            )}
          >
            <div className="flex items-center gap-2">
              <h3 className={cn('font-display font-bold text-xs uppercase tracking-wider', isDark ? 'text-white' : 'text-gray-900')}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[10px] font-bold text-brand-blue border border-brand-blue/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead('customer')}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-gray-400 hover:text-brand-blue transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Native Push Permission Prompt */}
          {permission !== 'granted' && (
            <div
              className={cn(
                'border-b px-4 py-2 flex items-center justify-between gap-3 text-xs',
                isDark ? 'border-white/10 bg-brand-blue/10 text-gray-300' : 'border-blue-100 bg-brand-blue-soft/50 text-gray-700'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-brand-blue shrink-0 animate-pulse" />
                <span className="text-[11px]">Enable live order updates</span>
              </div>
              <button
                type="button"
                onClick={() => requestPermission()}
                className="shrink-0 rounded bg-brand-blue px-2 py-0.5 text-[10px] font-bold text-white hover:bg-brand-blue-hover transition-colors cursor-pointer"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div
            className={cn(
              'max-h-[320px] overflow-y-auto divide-y overscroll-contain',
              isDark ? 'divide-white/5' : 'divide-gray-100'
            )}
          >
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Bell className="mx-auto h-7 w-7 opacity-40 mb-2" />
                <p className={cn('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-600')}>No new notifications</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Order updates and alerts will appear here</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    'group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left',
                    notif.read
                      ? isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                      : isDark ? 'bg-brand-blue/10 hover:bg-brand-blue/15' : 'bg-blue-50/50 hover:bg-blue-50/80'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                      isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'
                    )}
                  >
                    {getItemIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-xs font-semibold truncate',
                          notif.read
                            ? isDark ? 'text-gray-300' : 'text-gray-700'
                            : isDark ? 'text-white font-bold' : 'text-dark font-bold'
                        )}
                      >
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-blue shrink-0" />
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-[11px] leading-relaxed line-clamp-2 mt-0.5',
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      )}
                    >
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity rounded cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className={cn(
              'flex items-center justify-between border-t px-4 py-2.5 text-[11px]',
              isDark ? 'border-white/10 bg-white/[0.03] text-gray-400' : 'border-gray-100 bg-gray-50/80 text-gray-500'
            )}
          >
            <span className="text-[11px]">Order updates &amp; alerts</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/account/orders');
              }}
              className="font-bold text-brand-blue hover:underline cursor-pointer"
            >
              My Orders →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
