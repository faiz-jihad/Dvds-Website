import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { homepageApi } from '../../lib/homepageApi';
import { publicApi } from '../../lib/publicApi';

export const AnnouncementBar: React.FC = () => {
  const { data: homepageConfig } = useQuery({
    queryKey: ['homepage', 'config'],
    queryFn: () => homepageApi.getHomepageConfig(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: () => publicApi.getStoreSettings(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const announcement = homepageConfig?.announcement;

  const text = announcement?.text || settings?.announcement_center || 'Free UK Delivery on All Orders • Royal Mail Tracked 24/48 UK Dispatch';
  const linkText = announcement?.linkText || 'Delivery Info';
  const linkUrl = announcement?.linkUrl || settings?.announcement_link || '/delivery';
  const bg = announcement?.backgroundColor || '#0F1115';
  const textColor = announcement?.textColor || '#E2E8F0';

  // Segment messages by bullet point for mobile carousel
  const messages = React.useMemo(() => {
    if (!text) return [];
    const parts = text.split('•').map((s: string) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [text];
  }, [text]);

  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Keep the hook order stable when an admin enables/disables the live announcement.
  if (!text || (announcement && !announcement.enabled)) return null;

  return (
    <div
      className="text-xs py-1.5 sm:py-2 px-3 sm:px-4 border-b border-white/10 transition-colors"
      style={{ backgroundColor: bg, color: textColor }}
    >
      <div className="max-w-container mx-auto flex items-center justify-between gap-4">
        {/* Mobile View: Clean rotating message without truncation */}
        <div className="flex sm:hidden items-center justify-center gap-1.5 mx-auto font-medium text-center text-[11px] leading-tight px-1 min-h-[20px]">
          <Truck className="w-3.5 h-3.5 shrink-0 text-brand-blue" />
          <span className="transition-opacity duration-300 font-medium">
            {messages[activeIdx] || text}
          </span>
        </div>

        {/* Desktop View: Full announcement bar */}
        <div className="hidden sm:flex items-center gap-2 mx-0 font-medium truncate">
          <Truck className="w-3.5 h-3.5 shrink-0 text-brand-blue" />
          <span className="truncate">{text}</span>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs shrink-0 font-mono opacity-80 hover:opacity-100 transition-opacity">
          <Link to={linkUrl} className="hover:underline flex items-center gap-1">
            <span>{linkText}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <span>•</span>
          <Link to="/contact" className="hover:underline">
            Help
          </Link>
        </div>
      </div>
    </div>
  );
};
