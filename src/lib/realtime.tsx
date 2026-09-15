import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from './supabase';
import { useUiStore } from '../stores/useUiStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { registerServiceWorker } from './pushNotifications';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'offline';

export interface RealtimeEventInfo {
  table: string;
  eventType: string;
  timestamp: string;
}

interface RealtimeContextValue {
  status: RealtimeStatus;
  isConnected: boolean;
  lastEvent: RealtimeEventInfo | null;
  broadcastChange: (table: string, eventType?: string, data?: any) => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'offline',
  isConnected: false,
  lastEvent: null,
  broadcastChange: () => {},
});

const BROADCAST_CHANNEL_NAME = 'az_rayan_realtime_broadcast_v1';

export const RealtimeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>(isSupabaseConfigured ? 'connecting' : 'offline');
  const [lastEvent, setLastEvent] = useState<RealtimeEventInfo | null>(null);

  // Cross-tab broadcast channel for local instant synchronization
  const broadcastChannel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
    return null;
  }, []);

  const handleTableChange = (table: string, eventType = 'UPDATE', newRecord?: any) => {
    const info: RealtimeEventInfo = {
      table,
      eventType,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLastEvent(info);

    switch (table) {
      case 'products':
        queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
        queryClient.invalidateQueries({ queryKey: ['store', 'product'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        // Admin duty: Low stock alert
        if (newRecord && typeof newRecord.stock_quantity === 'number' && newRecord.stock_quantity <= 3 && newRecord.stock_quantity >= 0) {
          useNotificationStore.getState().addNotification({
            target: 'admin',
            type: 'stock',
            title: 'Low Stock Alert',
            message: `Film "${newRecord.title || 'Product'}" has only ${newRecord.stock_quantity} units remaining.`,
            link: '/admin/inventory',
          });
        }
        break;

      case 'orders':
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
        queryClient.invalidateQueries({ queryKey: ['store', 'orders'] });
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        if (eventType === 'INSERT') {
          const orderNum = newRecord?.order_number || 'new';
          const totalText = newRecord?.total_amount ? ` totalling £${Number(newRecord.total_amount).toFixed(2)}` : '';
          useUiStore.getState().addToast(`Order #${orderNum} received!`, 'info');
          // Admin duty: New order notification
          useNotificationStore.getState().addNotification({
            target: 'admin',
            type: 'order',
            title: 'New Order Received',
            message: `Order #${orderNum}${totalText} placed by customer.`,
            link: '/admin/orders',
          });
        } else if (eventType === 'UPDATE' && newRecord?.status) {
          // Customer duty: Order status update notification
          const orderNum = newRecord?.order_number || '';
          const statusText = newRecord.status === 'dispatched'
            ? 'has been dispatched with tracking'
            : newRecord.status === 'delivered'
            ? 'has been successfully delivered to your address'
            : `is now ${newRecord.status}`;
          useNotificationStore.getState().addNotification({
            target: 'customer',
            type: 'order',
            title: 'Order Status Updated',
            message: `Your order #${orderNum} ${statusText}.`,
            link: '/account/orders',
          });
        }
        break;

      case 'store_settings':
        queryClient.invalidateQueries({ queryKey: ['store', 'settings'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
        break;

      case 'homepage_config':
        queryClient.invalidateQueries({ queryKey: ['homepage', 'config'] });
        break;

      case 'categories':
        queryClient.invalidateQueries({ queryKey: ['store', 'categories'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
        queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        break;

      case 'genres':
        queryClient.invalidateQueries({ queryKey: ['store', 'genres'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] });
        queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        break;

      case 'product_genres':
        queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        break;

      case 'promotions':
        queryClient.invalidateQueries({ queryKey: ['store', 'promotions'] });
        queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
        // Customer duty: Promo code notification
        if (newRecord?.code && newRecord?.is_active) {
          useNotificationStore.getState().addNotification({
            target: 'customer',
            type: 'promo',
            title: 'Active Promotion Available!',
            message: `Use code ${newRecord.code} for exclusive savings today.`,
            link: '/shop?filter=sale',
          });
        }
        break;

      case 'contact_messages':
        queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
        if (eventType === 'INSERT') {
          useUiStore.getState().addToast('New customer enquiry received', 'info');
          // Admin duty: New customer support enquiry
          useNotificationStore.getState().addNotification({
            target: 'admin',
            type: 'support',
            title: 'New Customer Enquiry',
            message: `New message from ${newRecord?.name || 'Customer'}: "${newRecord?.subject || 'Support'}"`,
            link: '/admin/support',
          });
        }
        break;

      default:
        break;
    }
  };

  // Broadcast manual change across tabs (for instant feedback when editing)
  const broadcastChange = (table: string, eventType = 'UPDATE', data?: any) => {
    handleTableChange(table, eventType, data);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ table, eventType, data });
    }
  };

  // Register Push Service Worker
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // 1. Listen to BroadcastChannel across browser tabs
  useEffect(() => {
    if (!broadcastChannel) return;
    const onMessage = (event: MessageEvent) => {
      const { table, eventType, data } = event.data || {};
      if (table) {
        handleTableChange(table, eventType, data);
      }
    };
    broadcastChannel.addEventListener('message', onMessage);
    return () => {
      broadcastChannel.removeEventListener('message', onMessage);
    };
  }, [broadcastChannel]);

  // 2. Listen to Supabase Realtime WebSockets
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setStatus('offline');
      return;
    }

    const realtimeClient = supabase;
    setStatus('connecting');

    const channel = realtimeClient
      .channel('app-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => handleTableChange('products', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => handleTableChange('orders', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        (payload) => handleTableChange('store_settings', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'homepage_config' },
        (payload) => handleTableChange('homepage_config', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => handleTableChange('categories', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'genres' },
        (payload) => handleTableChange('genres', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_genres' },
        (payload) => handleTableChange('product_genres', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'promotions' },
        (payload) => handleTableChange('promotions', payload.eventType, payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_messages' },
        (payload) => handleTableChange('contact_messages', payload.eventType, payload.new)
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('connected');
          queryClient.invalidateQueries({ queryKey: ['admin', 'schema-health'] });
        } else if (subscribeStatus === 'CLOSED' || subscribeStatus === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        } else {
          setStatus('connecting');
        }
      });

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, []);

  const value = useMemo(
    () => ({
      status,
      isConnected: status === 'connected',
      lastEvent,
      broadcastChange,
    }),
    [status, lastEvent]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtimeStatus = () => useContext(RealtimeContext);
