import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  ShoppingCart,
  Star,
  Disc,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Product, StoreSettings } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, formatRuntime, cn } from '../../lib/formatters';

export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      const pathId = url.pathname.slice(1);
      return pathId.split('?')[0] || null;
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/embed/')[1]?.split('?')[0] || null;
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/shorts/')[1]?.split('?')[0] || null;
      }
      const v = url.searchParams.get('v');
      if (v) return v;
    }
  } catch {
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (match?.[1]) return match[1];
  }

  return null;
}

interface AzCinematicHeroProps {
  products: Product[];
  settings?: StoreSettings | null;
}

interface HeroYouTubeBackdropProps {
  currentId: string;
  videoId: string;
  startSec: number;
  endSec: number;
  isMuted: boolean;
  isLoop: boolean;
}

const HeroYouTubeBackdrop: React.FC<HeroYouTubeBackdropProps> = ({
  currentId,
  videoId,
  startSec,
  endSec,
  isMuted,
  isLoop,
}) => {
  const [cycle, setCycle] = useState(0);
  const duration = endSec > startSec ? endSec - startSec : 0;

  // Loop timer for custom segment timing (e.g. from minute:second to minute:second)
  useEffect(() => {
    if (!isLoop || duration <= 0) return;
    const timer = setTimeout(() => {
      setCycle((c) => c + 1);
    }, duration * 1000);
    return () => clearTimeout(timer);
  }, [isLoop, duration, cycle, currentId, videoId, startSec]);

  // Listen to YouTube API postMessage for state changes and loop
  useEffect(() => {
    const sendCommand = (func: string, args: any[] = []) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch {}
    };

    // Handshake with YouTube Iframe API
    const interval = setInterval(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      } catch {}
    }, 1000);

    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'onStateChange') {
          if (data.info === 0) {
            // Video ended -> restart loop
            if (isLoop) {
              setCycle((c) => c + 1);
              sendCommand('playVideo');
            }
          } else if (data.info === 2) {
            // Player was paused -> instantly resume playback so pause icon, title, & thumbnails never linger
            sendCommand('playVideo');
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, [isLoop]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Resume video immediately when user returns to this browser tab to prevent paused state icon
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
          );
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
      <iframe
        ref={iframeRef}
        key={`${currentId}-${videoId}-${startSec}-${cycle}-${isMuted}`}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[142%] h-[142%] sm:w-[max(135%,200vh)] sm:h-[max(135%,65vw)] sm:scale-[1.25] origin-center pointer-events-none select-none opacity-100"
        style={{ pointerEvents: 'none' }}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${isMuted ? '1' : '0'}&controls=0&start=${startSec}&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&modestbranding=1&fs=0&enablejsapi=1&loop=1&playlist=${videoId}&cc_load_policy=0&cc_lang_pref=none&hl=en`}
        title="Featured Cinema Trailer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="eager"
        onLoad={() => {
          try {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'listening' }),
              '*'
            );
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
              '*'
            );
          } catch {}
        }}
      />
      {/* Top crop guard gradient: 64px gradient completely cloaks YouTube title and channel branding */}
      <div className="absolute top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b from-[#07090E] via-[#07090E]/90 to-transparent pointer-events-none z-[6]" />
      {/* Bottom crop guard gradient: seamlessly blends YouTube watermark & recommendations into #07090E */}
      <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-24 bg-gradient-to-t from-[#07090E] via-[#07090E]/90 to-transparent pointer-events-none z-[6]" />
      {/* Click-shield overlay: intercepts all user interactions so YouTube player never receives clicks, pauses, or shows play/pause icon */}
      <div className="absolute inset-0 z-[5] bg-transparent cursor-default pointer-events-auto" />
    </div>
  );
};

export const AzCinematicHero: React.FC<AzCinematicHeroProps> = ({ products, settings }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isYouTubeEnabled = Boolean(settings?.hero_youtube_enabled);
  const [isMuted, setIsMuted] = useState(settings?.hero_youtube_mute ?? true);
  const isLoop = settings?.hero_youtube_loop ?? true;

  // Prioritize films specifically selected by admin in hero_trailers, otherwise fall back to active featured
  const featured = React.useMemo(() => {
    if (settings?.hero_trailers && settings.hero_trailers.length > 0) {
      const configured = settings.hero_trailers
        .map((t) => products.find((p) => p.id === t.product_id))
        .filter(Boolean) as Product[];
      if (configured.length > 0) return configured;
    }
    const list = products.filter((p) => p.status === 'active' && p.stock_quantity > 0);
    const highlighted = list.filter((p) => p.is_featured || p.is_best_seller || p.is_new_release);
    return (highlighted.length >= 3 ? highlighted : list).slice(0, 6);
  }, [products, settings?.hero_trailers]);

  const addItem = useCartStore((s) => s.addItem);
  const { openCartDrawer, addToast } = useUiStore();

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const gotoSlide = useCallback(
    (idx: number) => {
      if (isTransitioning || idx === activeIndex) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex(idx);
        setIsTransitioning(false);
      }, 300);
    },
    [isTransitioning, activeIndex]
  );

  const nextSlide = useCallback(() => {
    if (featured.length <= 1) return;
    gotoSlide((activeIndex + 1) % featured.length);
  }, [activeIndex, featured.length, gotoSlide]);

  const prevSlide = useCallback(() => {
    if (featured.length <= 1) return;
    gotoSlide((activeIndex - 1 + featured.length) % featured.length);
  }, [activeIndex, featured.length, gotoSlide]);

  // Automatic slide rotation every 8 seconds (pauses on hover)
  useEffect(() => {
    if (featured.length <= 1 || isPaused) return;
    const interval = setInterval(nextSlide, 8000);
    return () => clearInterval(interval);
  }, [featured.length, isPaused, nextSlide]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
  };

  if (featured.length === 0) return null;

  const current = featured[activeIndex] || featured[0];
  const formatBadge = current.format === 'Box Set' ? 'Collector Box Set' : current.format || 'DVD Edition';

  // Per-film trailer matching & timing calculation
  const currentTrailer = React.useMemo(() => {
    if (!current) return null;
    return settings?.hero_trailers?.find((t) => t.product_id === current.id) || null;
  }, [current, settings?.hero_trailers]);

  const rawTrailerUrl = currentTrailer?.youtube_url?.trim() || settings?.hero_youtube_url?.trim() || '';
  const youtubeVideoId = extractYouTubeVideoId(rawTrailerUrl);
  const isYouTubeActive = isYouTubeEnabled && Boolean(youtubeVideoId);

  // Calculate start and end timing in seconds (per-film custom trailer or fallback to global settings)
  const isUsingCustomTrailer = Boolean(currentTrailer?.youtube_url?.trim());

  const startMinutes = isUsingCustomTrailer
    ? (currentTrailer?.start_minutes ?? 0)
    : (settings?.hero_youtube_start_minutes ?? 0);
  const startSeconds = isUsingCustomTrailer
    ? (currentTrailer?.start_seconds ?? 0)
    : (settings?.hero_youtube_start_seconds ?? 0);

  const endMinutes = isUsingCustomTrailer
    ? currentTrailer?.end_minutes
    : settings?.hero_youtube_end_minutes;
  const endSeconds = isUsingCustomTrailer
    ? currentTrailer?.end_seconds
    : settings?.hero_youtube_end_seconds;

  const startSec = Math.max(0, (startMinutes * 60) + startSeconds);
  const endSec =
    endMinutes !== undefined || endSeconds !== undefined
      ? ((endMinutes ?? 0) * 60) + (endSeconds ?? 0)
      : 0;
  const hasEnd = endSec > startSec;

  const handleAddCurrentToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (current.stock_quantity === 0) return;
    addItem(current);
    addToast(`"${current.title}" added to basket`, 'success');
    openCartDrawer();
  };

  return (
    <section
      className="relative w-full flex flex-col sm:block overflow-hidden select-none bg-[#07090E]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured Physical DVD Premiere Showcase"
    >
      {/* ── 1. Dedicated 16:9 Widescreen Video Stage on Mobile / Full-bleed Backdrop on Desktop ── */}
      <div className="relative sm:absolute w-full aspect-video sm:aspect-auto sm:inset-0 z-0 overflow-hidden bg-[#07090E] shrink-0 border-0 outline-none">
        {isYouTubeActive && youtubeVideoId ? (
          <HeroYouTubeBackdrop
            currentId={current.id}
            videoId={youtubeVideoId}
            startSec={startSec}
            endSec={endSec}
            isMuted={isMuted}
            isLoop={isLoop}
          />
        ) : (
          <div
            className={cn(
              'absolute inset-0 transition-all duration-700 ease-out',
              isTransitioning ? 'opacity-20 scale-105 blur-sm' : 'opacity-100 scale-100 blur-0'
            )}
          >
            <img
              src={current.cover_image_url}
              alt={current.title}
              className="w-full h-full object-cover object-center lg:object-right-top scale-105"
            />
          </div>
        )}

        {/* Soft Cinematic Bottom Dissolve: seamlessly melts the video into the dark background and text with NO harsh cutoff or divider line */}
        <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-44 bg-gradient-to-t from-[#07090E] via-[#07090E]/85 to-transparent pointer-events-none z-[5]" />
        {!isYouTubeActive && (
          <>
            <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/90 to-transparent sm:w-4/5 lg:w-3/5" />
            <div className="hidden sm:block absolute inset-0 bg-radial from-transparent via-[#07090E]/40 to-[#07090E]" />
          </>
        )}

        {/* Mobile controls overlay directly on video (dots and unmute button) */}
        <div className="sm:hidden absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          {featured.length > 1 ? (
            <div className="flex items-center gap-1.5 pointer-events-auto bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
              {featured.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => gotoSlide(idx)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                    idx === activeIndex
                      ? 'w-5 bg-amber-400'
                      : 'w-1.5 bg-white/40 hover:bg-white/70'
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          ) : <div />}

          {isYouTubeActive && (
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold shadow-xl transition-all cursor-pointer pointer-events-auto active:scale-95"
              title={isMuted ? 'Turn Sound On' : 'Mute Background Video'}
            >
              {isMuted ? (
                <>
                  <VolumeX size={12} className="text-gray-300" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 size={12} className="text-brand-blue animate-pulse" />
                  <span className="font-bold text-brand-blue">Sound On</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Content Container: Seamlessly flows below 16:9 video on mobile with gentle overlap to guarantee 0px seams ── */}
      <div className="relative z-10 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-2 sm:mt-0 pt-2 pb-6 sm:py-16 sm:min-h-[82vh] lg:min-h-[88vh] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-12">
        {/* LEFT COLUMN: Editorial Details & Action */}
        <div
          className={cn(
            'flex-1 max-w-2xl transition-all duration-500 w-full',
            isTransitioning ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          )}
        >
          {/* Editorial Archive Overline (Authentic Cinema Kicker, No AI Sparkles or Pill Shape) */}
          {settings?.hero_badge_text && (
            <div className="mb-1 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-[0.2em] text-amber-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-1 truncate">
              {settings.hero_badge_text}
            </div>
          )}

          {/* Format & Release Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-brand-blue text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md">
              <Disc size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
              {formatBadge}
            </span>

            {current.is_new_release && (
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-brand-red text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-md">
                New Release
              </span>
            )}
          </div>

          {/* Large Movie Title */}
          <h1 className="text-xl sm:text-4xl lg:text-6xl font-black text-white leading-tight sm:leading-[1.12] tracking-tight mb-2 sm:mb-3 drop-shadow-md line-clamp-2">
            {current.title}
          </h1>

          {/* Movie Metadata Strip */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300 font-semibold mb-3.5 sm:mb-6">
            {current.imdb_rating && (
              <span className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 font-black text-[11px] sm:text-xs">
                <Star size={12} fill="#fcd34d" />
                {current.imdb_rating.toFixed(1)} IMDb
              </span>
            )}

            <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-white font-bold text-[10px] sm:text-xs">
              {current.age_rating || '15'}
            </span>

            <span className="text-[11px] sm:text-xs">{current.release_year}</span>

            {current.runtime_minutes && (
              <>
                <span className="text-gray-500">&bull;</span>
                <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                  <Clock size={11} className="text-gray-400" />
                  {formatRuntime(current.runtime_minutes)}
                </span>
              </>
            )}

            {current.genres?.[0] && (
              <>
                <span className="text-gray-500">&bull;</span>
                <span className="text-brand-blue font-bold text-[11px] sm:text-xs">{current.genres[0].name}</span>
              </>
            )}
          </div>

          {/* CTA Buttons Row: Side-by-side 1-row grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-4 w-full sm:w-auto">
            <Link
              to={`/product/${current.slug}`}
              className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-8 py-2.5 sm:py-3.5 rounded-xl bg-white text-dark hover:bg-gray-100 font-black text-xs sm:text-sm tracking-wide transition-all shadow-xl hover:shadow-2xl active:scale-95 cursor-pointer text-center whitespace-nowrap"
            >
              <Play size={14} className="shrink-0" fill="currentColor" />
              <span className="truncate">{settings?.hero_cta_primary || 'View Details'}</span>
            </Link>

            <button
              type="button"
              onClick={handleAddCurrentToCart}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg hover:shadow-brand-blue/30 active:scale-95 cursor-pointer border border-brand-blue/40 text-center whitespace-nowrap"
            >
              <ShoppingCart size={14} className="shrink-0" />
              <span className="truncate">{settings?.hero_cta_secondary || 'Curator Picks'} &bull; {formatGBP(current.price)}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Physical DVD Case Stage (Desktop only) */}
        <div className="hidden sm:flex flex-col items-center justify-center shrink-0 relative">
          <div
            className={cn(
              'relative transition-all duration-700 ease-out transform',
              isTransitioning
                ? 'opacity-0 scale-95 rotate-y-12'
                : 'opacity-100 scale-100 rotate-y-0'
            )}
            style={{ perspective: 1000 }}
          >
            {/* Subtle Ambient Backlight Glow behind the Case */}
            <div className="absolute -inset-3 bg-gradient-to-tr from-brand-blue/25 via-white/10 to-amber-400/20 rounded-3xl blur-2xl opacity-60 pointer-events-none -z-10 group-hover:opacity-90 transition-opacity duration-500" />

            {/* 3D Physical DVD Case Container */}
            <Link
              to={`/product/${current.slug}`}
              className="block relative w-[190px] sm:w-[220px] lg:w-[250px] aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border-2 border-white/25 ring-1 ring-white/10 group cursor-pointer animate-hero-card-float transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,1)]"
            >
              <img
                src={current.cover_image_url}
                alt={current.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />

              {/* Spine edge gloss & highlight */}
              <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-white/40 via-white/15 to-transparent pointer-events-none" />

              {/* Diagonal plastic cover reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none group-hover:via-white/20 transition-all duration-500" />

              {/* Physical DVD banner badge */}
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 flex items-center justify-between text-[11px] font-bold text-white transition-colors duration-300 group-hover:border-white/30">
                <span className="truncate">{current.format || 'DVD'}</span>
                <span className="text-emerald-400 font-mono">{formatGBP(current.price)}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Desktop Slider Navigation Controls & Audio Toggle (Desktop only) ── */}
      <div className="hidden sm:flex absolute bottom-4 left-4 sm:left-8 right-4 sm:right-8 z-20 pointer-events-none items-center justify-between gap-4">
        {featured.length > 1 ? (
          <div className="flex items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {featured.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => gotoSlide(idx)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300 cursor-pointer',
                  idx === activeIndex
                    ? 'w-7 bg-brand-blue'
                    : 'w-2 bg-white/30 hover:bg-white/70'
                )}
                aria-label={`Switch to movie ${idx + 1}: ${item.title}`}
              />
            ))}
          </div>
        ) : <div />}

        {isYouTubeActive && (
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-xl transition-all cursor-pointer pointer-events-auto active:scale-95"
            title={isMuted ? 'Turn Sound On' : 'Mute Background Video'}
          >
            {isMuted ? (
              <>
                <VolumeX size={14} className="text-gray-300" />
                <span className="text-[11px] hidden min-[400px]:inline">Unmute Trailer</span>
              </>
            ) : (
              <>
                <Volume2 size={14} className="text-brand-blue animate-pulse" />
                <span className="text-[11px] hidden min-[400px]:inline font-bold text-brand-blue">Sound On</span>
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};
export default AzCinematicHero;
