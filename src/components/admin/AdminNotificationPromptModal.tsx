import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { isPushSupported } from '../../lib/pushNotifications';
import { cn } from '../../lib/formatters';

interface AdminNotificationPromptModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const AdminNotificationPromptModal: React.FC<AdminNotificationPromptModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const permission = useNotificationStore((s) => s.permission);
  const updatePermission = useNotificationStore((s) => s.updatePermission);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const sendTestPaidNotification = useNotificationStore((s) => s.sendTestPaidNotification);

  const [isOpen, setIsOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showDeniedHelp, setShowDeniedHelp] = useState(false);

  // Update permission status on mount
  useEffect(() => {
    updatePermission();
  }, [updatePermission]);

  // Auto-prompt logic when opening Admin
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    if (typeof window === 'undefined') return;

    // Check if push is supported by this browser
    if (!isPushSupported()) return;

    // If permission has already been granted, do not auto-open
    if (permission === 'granted') {
      setIsOpen(false);
      return;
    }

    // If permission was denied, do not auto-open popup (show banner instead)
    if (permission === 'denied') {
      return;
    }

    // If permission is 'default' (never asked yet), check if dismissed in this session
    const dismissedSession = sessionStorage.getItem('dvds_admin_notif_modal_dismissed');
    if (dismissedSession === 'true') return;

    // Small delay for smooth entry experience when loading the admin view
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [forceOpen, permission]);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('dvds_admin_notif_modal_dismissed', 'true');
    } catch {}
    onClose?.();
  };

  const handleEnableClick = async () => {
    setIsRequesting(true);
    try {
      const res = await requestPermission();
      if (res === 'granted') {
        setIsOpen(false);
        try {
          sessionStorage.setItem('dvds_admin_notif_modal_dismissed', 'true');
        } catch {}
        onClose?.();
      } else if (res === 'denied') {
        setShowDeniedHelp(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-7 shadow-2xl text-slate-900 dark:text-white animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Tutup prompt notifikasi"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue border border-brand-blue/20">
            <Bell className="h-6 w-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
            </span>
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-blue border border-blue-200/60 dark:border-blue-800/40">
              Penting Untuk Admin
            </span>
            <h2 id="notif-modal-title" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Aktifkan Notifikasi Pesanan di HP
            </h2>
          </div>
        </div>

        {/* Content Body */}
        {showDeniedHelp ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold mb-1 text-amber-800 dark:text-amber-200">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Izin Notifikasi Diblokir di Browser</span>
              </div>
              <p className="leading-relaxed text-[11.5px]">
                Browser Anda saat ini memblokir notifikasi untuk situs ini. Ikuti 3 langkah mudah berikut untuk mengaktifkannya di HP:
              </p>
              <ol className="mt-2 list-decimal list-inside space-y-1 font-medium text-[11px] text-amber-950 dark:text-amber-200">
                <li>Ketuk ikon <strong>Gembok (🔒)</strong> atau setelan di sebelah kiri link <code>dvds-zone.co.uk</code> pada browser HP Anda.</li>
                <li>Pilih menu <strong>Izin (Permissions)</strong> → ubah <strong>Notifikasi</strong> menjadi <strong>Izinkan (Allow)</strong>.</li>
                <li>Muat ulang (refresh) halaman ini.</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  updatePermission();
                  if (useNotificationStore.getState().permission === 'granted') {
                    setIsOpen(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-colors cursor-pointer shadow-xs"
              >
                Cek Ulang Izin Browser
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Pastikan Anda langsung mengetahui saat ada pelanggan yang melakukan checkout atau pembayaran. HP Anda akan berdering, bergetar, dan memunculkan pop-up pemberitahuan secara instan.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-2 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Volume2 className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Dering Suara Lonceng Instan:</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    Berbunyi otomatis begitu pelanggan menyelesaikan transaksi.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Smartphone className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Getaran di HP:</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    HP bergetar meskipun sedang berada di saku atau mode diam.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Notifikasi Layar Kunci:</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    Bisa langsung diketuk untuk membuka detail pesanan & resi kirim.
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleEnableClick}
                disabled={isRequesting}
                className="w-full py-3 px-4 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs sm:text-sm transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isRequesting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Menghubungkan Izin Browser...</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    <span>Aktifkan Notifikasi Pesanan Sekarang</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2 px-3 text-center text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Nanti Saja (Bisa Diaktifkan Lewat Menu Atas)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminNotificationBanner: React.FC<{
  onOpenModal?: () => void;
}> = ({ onOpenModal }) => {
  const permission = useNotificationStore((s) => s.permission);
  const updatePermission = useNotificationStore((s) => s.updatePermission);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const sendTestPaidNotification = useNotificationStore((s) => s.sendTestPaidNotification);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    updatePermission();
  }, [updatePermission]);

  if (!isPushSupported()) return null;

  // Case 1: Permission is already granted
  if (permission === 'granted') {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-emerald-900 dark:text-emerald-300 truncate">
            Notifikasi Pesanan HP Aktif
          </span>
          <span className="hidden sm:inline text-emerald-700/80 dark:text-emerald-400/80 text-[11px]">
            — HP akan berdering &amp; bergetar saat pesanan baru masuk
          </span>
        </div>
        <button
          type="button"
          onClick={() => sendTestPaidNotification()}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-white/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/70 transition-colors cursor-pointer shadow-2xs"
          title="Uji coba suara dan getaran di HP"
        >
          <Volume2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Test Suara &amp; HP</span>
        </button>
      </div>
    );
  }

  // Case 2: Permission is denied by browser
  if (permission === 'denied') {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900 dark:text-amber-200">
              Notifikasi pesanan diblokir oleh browser HP:
            </span>{' '}
            <span className="text-amber-800 dark:text-amber-300 text-[11.5px]">
              Ketuk ikon gembok 🔒 di samping link browser → Izin Situs → Izinkan Notifikasi agar HP berdering saat ada pesanan.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updatePermission()}
          className="shrink-0 self-start sm:self-auto rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-2xs"
        >
          Cek Ulang Izin
        </button>
      </div>
    );
  }

  // Case 3: Permission is default (never granted nor denied yet)
  return (
    <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white shadow-2xs">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
        </div>
        <div>
          <span className="font-bold text-blue-950 dark:text-blue-100">
            Aktifkan Notifikasi Pesanan di HP Anda
          </span>
          <p className="text-[11px] text-blue-800/90 dark:text-blue-300">
            Dapatkan peringatan suara, getaran, dan push notif setiap kali ada pesanan baru atau pembayaran masuk.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          onClick={async () => {
            setRequesting(true);
            try {
              await requestPermission();
            } finally {
              setRequesting(false);
            }
          }}
          disabled={requesting}
          className="rounded-lg bg-brand-blue hover:bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>{requesting ? 'Menghubungkan...' : 'Aktifkan Notifikasi Sekarang'}</span>
        </button>
      </div>
    </div>
  );
};
