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
import { useThemeStore } from '../../stores/useThemeStore';
import { formatGBP, formatRuntime, cn } from '../../lib/formatters';

export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const raw = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    const url = new URL(raw);
    if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) {
      const pathId = url.pathname.slice(1);
      return pathId.split('?')[0]?.split('&')[0] || null;
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/embed/')[1]?.split('?')[0]?.split('&')[0] || null;
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/shorts/')[1]?.split('?')[0]?.split('&')[0] || null;
      }
      if (url.pathname.startsWith('/live/')) {
        return url.pathname.split('/live/')[1]?.split('?')[0]?.split('&')[0] || null;
      }
      const v = url.searchParams.get('v');
      if (v) return v;
    }
  } catch {
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function isDirectVideoUrl(input?: string | null): boolean {
  if (!input) return false;
  const trimmed = input.trim().toLowerCase();
  return (
    trimmed.endsWith('.mp4') ||
    trimmed.endsWith('.webm') ||
    trimmed.endsWith('.ogg') ||
    trimmed.includes('cloudinary.com') ||
    trimmed.includes('/video/upload/')
  );
}


interface HeroDirectVideoBackdropProps {
  src: string;
  isMuted: boolean;
  fallbackImageUrl?: string;
}

const HeroDirectVideoBackdrop: React.FC<HeroDirectVideoBackdropProps> = ({
  src,
  isMuted,
  fallbackImageUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
      {fallbackImageUrl && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-700 ease-out z-0',
            isPlaying && !hasError ? 'opacity-0' : 'opacity-100'
          )}
        >
          <img
            src={fallbackImageUrl}
            alt="Cinema Backdrop"
            className="w-full h-full object-cover object-center lg:object-right-top scale-105"
          />
        </div>
      )}
      {!hasError && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          onPlay={() => {
            setIsPlaying(true);
            setHasError(false);
          }}
          onError={() => setHasError(true)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out z-[1]',
            isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

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
  isDark: boolean;
  fallbackImageUrl?: string;
}

const HeroYouTubeBackdrop: React.FC<HeroYouTubeBackdropProps> = ({
  currentId,
  videoId,
  startSec,
  endSec,
  isMuted,
  isLoop,
  isDark,
  fallbackImageUrl,
}) => {
  const [cycle, setCycle] = useState(0);
  const [posterFaded, setPosterFaded] = useState(false);
  const duration = endSec > startSec ? endSec - startSec : 0;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Send postMessage helper to YouTube Iframe
  const sendCommand = useCallback((func: string, args: any[] = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch {}
  }, []);

  // Cover the video with poster on film change until actively playing
  useEffect(() => {
    setPosterFaded(false);
  }, [videoId, currentId, cycle]);

  // Handle Mute/Unmute dynamically without destroying the iframe
  useEffect(() => {
    if (isMuted) {
      sendCommand('mute');
      sendCommand('setVolume', [0]);
    } else {
      sendCommand('unMute');
      sendCommand('setVolume', [100]);
    }
  }, [isMuted, sendCommand]);

  // Loop timer for custom segment timing (e.g. from startSec to endSec)
  useEffect(() => {
    if (!isLoop || duration <= 0) return;
    const timer = setTimeout(() => {
      sendCommand('seekTo', [startSec, true]);
      sendCommand('playVideo');
      setCycle((c) => c + 1);
    }, duration * 1000);
    return () => clearTimeout(timer);
  }, [isLoop, duration, cycle, currentId, videoId, startSec, sendCommand]);

  // Listen to YouTube API postMessage:
  // - ONLY reveal video (fade poster) when playerState === 1 (actively playing)
  // - If paused (playerState === 2), IMMEDIATELY re-cover with poster to hide pause button & auto-resume
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        const playerState =
          data?.info?.playerState !== undefined
            ? data.info.playerState
            : data?.event === 'onStateChange'
              ? data.info
              : undefined;

        if (playerState === 1 || (data?.info?.currentTime > 0 && playerState !== 2)) {
          // Actively playing frames -> fade out cover poster smoothly
          setPosterFaded(true);
        } else if (playerState === 2) {
          // Paused -> IMMEDIATELY re-cover with poster so YouTube pause button is NEVER visible
          setPosterFaded(false);
          sendCommand('playVideo');
        } else if (playerState === 0) {
          // Video ended -> re-cover and restart loop smoothly
          setPosterFaded(false);
          if (isLoop) {
            sendCommand('seekTo', [startSec, true]);
            sendCommand('playVideo');
            setCycle((c) => c + 1);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoop, startSec, sendCommand]);

  // Mobile gesture kickstart & tab resume: ensures playback starts and stays active without ever pausing
  useEffect(() => {
    const handleResume = () => {
      sendCommand('playVideo');
    };
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('touchstart', handleResume, { passive: true, once: true });
    window.addEventListener('scroll', handleResume, { passive: true, once: true });
    window.addEventListener('click', handleResume, { passive: true, once: true });
    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('touchstart', handleResume);
      window.removeEventListener('scroll', handleResume);
      window.removeEventListener('click', handleResume);
    };
  }, [sendCommand]);

  // Removed &origin= because raw IP/local network domains (e.g. 192.168.x.x on mobile) cause YouTube API security blocks
  // Removed &playlist= to avoid playlist UI
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&start=${startSec}&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&modestbranding=1&fs=0&enablejsapi=1&cc_load_policy=0`;

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
      {/* 1. YouTube Iframe Video: Active at z-[1] */}
      <iframe
        ref={iframeRef}
        key={`${currentId}-${videoId}-${startSec}`}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] scale-[1.25] sm:w-[max(135%,200vh)] sm:h-[max(135%,65vw)] sm:scale-[1.3] origin-center pointer-events-none select-none opacity-100 z-[1]"
        style={{ pointerEvents: 'none', touchAction: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
        src={embedUrl}
        title="Featured Cinema Trailer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => {
          try {
            iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
              '*'
            );
          } catch {}
          sendCommand('mute');
          sendCommand('playVideo');
          setTimeout(() => sendCommand('playVideo'), 300);
          setTimeout(() => sendCommand('playVideo'), 800);
          if (!isMuted) {
            sendCommand('unMute');
            sendCommand('setVolume', [100]);
          }
        }}
      />

      {/* 2. Cover Poster: Sits in front of iframe at z-[2] to 100% mask initial buffer/pause icon, then dissolves away only when playing */}
      {fallbackImageUrl && (
        <div
          className={cn(
            'absolute inset-0 z-[2] transition-opacity duration-700 ease-out pointer-events-none',
            posterFaded ? 'opacity-0' : 'opacity-100'
          )}
        >
          <img
            src={fallbackImageUrl}
            alt="Cinema Backdrop"
            className="w-full h-full object-cover object-center lg:object-right-top scale-105"
          />
        </div>
      )}

      {/* Top crop guard gradient: blends to the active theme color */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b pointer-events-none z-[6] transition-colors duration-300',
          isDark
            ? 'from-[#07090E] via-[#07090E]/90 to-transparent'
            : 'from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent'
        )}
      />

      {/* Bottom crop guard gradient: seamlessly blends YouTube watermark & controls into the active theme */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-20 sm:h-24 bg-gradient-to-t pointer-events-none z-[6] transition-colors duration-300',
          isDark
            ? 'from-[#07090E] via-[#07090E]/90 to-transparent'
            : 'from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent'
        )}
      />

      {/* Click/Touch shield overlay: intercepts ALL clicks/touches so YouTube can NEVER be paused by user */}
      <div
        className="absolute inset-0 z-[10] bg-transparent cursor-default pointer-events-auto select-none"
        style={{ touchAction: 'pan-y', WebkitTapHighlightColor: 'transparent' }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sendCommand('playVideo');
        }}
        onTouchStart={() => {
          sendCommand('playVideo');
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export const AzCinematicHero: React.FC<AzCinematicHeroProps> = ({ products, settings }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const isYouTubeEnabled = settings?.hero_youtube_enabled ?? true;
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

  // Per-film trailer matching & timing calculation (Purely dynamic from Admin Settings or Product data)
  const currentTrailer = React.useMemo(() => {
    if (!current) return null;

    // 1. Check if configured for this specific film in Admin Store Settings
    const adminTrailer = settings?.hero_trailers?.find(
      (t) => (t.product_id === current.id || t.product_id === current.slug) && Boolean(t.youtube_url?.trim())
    );
    if (adminTrailer) {
      return adminTrailer;
    }

    // 2. Check if product itself has a trailer URL attached in catalogue data
    const productTrailer = (current as any).trailer_url || (current as any).video_url;
    if (productTrailer && typeof productTrailer === 'string' && productTrailer.trim()) {
      return {
        product_id: current.id,
        youtube_url: productTrailer.trim(),
        start_seconds: 0,
      };
    }

    // 3. Fallback to global fallback trailer configured by admin in Store Settings (if any)
    if (settings?.hero_youtube_url?.trim()) {
      return {
        product_id: current.id,
        youtube_url: settings.hero_youtube_url.trim(),
        start_minutes: settings.hero_youtube_start_minutes ?? 0,
        start_seconds: settings.hero_youtube_start_seconds ?? 0,
        end_minutes: settings.hero_youtube_end_minutes,
        end_seconds: settings.hero_youtube_end_seconds,
      };
    }

    // No video configured: cleanly return null without any hardcoded fallback
    return null;
  }, [
    current,
    settings?.hero_trailers,
    settings?.hero_youtube_url,
    settings?.hero_youtube_start_minutes,
    settings?.hero_youtube_start_seconds,
    settings?.hero_youtube_end_minutes,
    settings?.hero_youtube_end_seconds,
  ]);

  const rawTrailerUrl = currentTrailer?.youtube_url?.trim() || '';
  const isDirectVideo = isDirectVideoUrl(rawTrailerUrl);
  const youtubeVideoId = extractYouTubeVideoId(rawTrailerUrl);
  const isVideoActive = Boolean(isYouTubeEnabled && rawTrailerUrl && (youtubeVideoId || isDirectVideo));

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
      className={cn(
        'relative w-full flex flex-col sm:block overflow-hidden select-none transition-colors duration-300',
        isDark ? 'bg-[#07090E]' : 'bg-[#F8FAFC]'
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured Physical DVD Premiere Showcase"
    >
      {/* ── 1. Dedicated 16:9 Widescreen Video Stage on Mobile / Full-bleed Backdrop on Desktop ── */}
      <div
        className={cn(
          'relative sm:absolute w-full aspect-video sm:aspect-auto sm:inset-0 z-0 overflow-hidden shrink-0 border-0 outline-none transition-colors duration-300',
          isDark ? 'bg-[#07090E]' : 'bg-[#F8FAFC]'
        )}
      >
        {isVideoActive && isDirectVideo ? (
          <HeroDirectVideoBackdrop
            key={`${current.id}-${rawTrailerUrl}`}
            src={rawTrailerUrl}
            isMuted={isMuted}
            fallbackImageUrl={current.cover_image_url}
          />
        ) : isVideoActive && youtubeVideoId ? (
          <HeroYouTubeBackdrop
            key={`${current.id}-${youtubeVideoId}-${startSec}`}
            currentId={current.id}
            videoId={youtubeVideoId}
            startSec={startSec}
            endSec={endSec}
            isMuted={isMuted}
            isLoop={isLoop}
            isDark={isDark}
            fallbackImageUrl={current.cover_image_url}
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

        {/* Soft Cinematic Bottom Dissolve: seamlessly melts the video into the theme background with NO harsh cutoff */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-20 sm:h-44 bg-gradient-to-t pointer-events-none z-[5] transition-colors duration-300',
            isDark
              ? 'from-[#07090E] via-[#07090E]/85 to-transparent'
              : 'from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent'
          )}
        />

        {/* Left text readability protection gradient (adapts to active theme) */}
        <div
          className={cn(
            'hidden sm:block absolute inset-0 sm:w-4/5 lg:w-3/5 pointer-events-none z-[4] transition-colors duration-300',
            isDark
              ? 'bg-gradient-to-r from-[#07090E] via-[#07090E]/85 to-transparent'
              : 'bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent'
          )}
        />
        {isDark && (
          <div className="hidden sm:block absolute inset-0 bg-radial from-transparent via-[#07090E]/40 to-[#07090E] pointer-events-none z-[4]" />
        )}

        {/* Interaction shield: blocks clicks on desktop without blocking mobile touches/swipes */}
        <div
          className="absolute inset-0 z-[8] bg-transparent select-none cursor-default pointer-events-auto"
          style={{ touchAction: 'pan-y', WebkitTapHighlightColor: 'transparent' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-hidden="true"
        />

        {/* Mobile controls overlay directly on video (dots and unmute button) */}
        <div className="sm:hidden absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          {featured.length > 1 ? (
            <div
              className={cn(
                'flex items-center gap-1.5 pointer-events-auto backdrop-blur-md px-2.5 py-1 rounded-full border transition-colors',
                isDark
                  ? 'bg-black/75 border-white/15'
                  : 'bg-white/85 border-gray-200 shadow-md'
              )}
            >
              {featured.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => gotoSlide(idx)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                    idx === activeIndex
                      ? 'w-5 bg-brand-blue'
                      : isDark
                        ? 'w-1.5 bg-white/40 hover:bg-white/70'
                        : 'w-1.5 bg-gray-400 hover:bg-gray-600'
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          ) : <div />}

          {isVideoActive && (
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-semibold shadow-xl transition-all cursor-pointer pointer-events-auto active:scale-95',
                isDark
                  ? 'bg-black/75 hover:bg-black/90 border-white/20 text-white'
                  : 'bg-white/90 hover:bg-white border-gray-200 text-gray-800 shadow-md'
              )}
              title={isMuted ? 'Turn Sound On' : 'Mute Background Video'}
            >
              {isMuted ? (
                <>
                  <VolumeX size={12} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
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
          {/* Editorial Archive Overline (Authentic Cinema Kicker) */}
          {settings?.hero_badge_text && (
            <div
              className={cn(
                'mb-1 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-[0.2em] line-clamp-1 truncate',
                isDark
                  ? 'text-amber-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                  : 'text-amber-600 drop-shadow-xs'
              )}
            >
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
          <h1
            className={cn(
              'text-xl sm:text-4xl lg:text-6xl font-black leading-tight sm:leading-[1.12] tracking-tight mb-2 sm:mb-3 line-clamp-2 transition-colors duration-200',
              isDark ? 'text-white drop-shadow-md' : 'text-gray-900 drop-shadow-xs'
            )}
          >
            {current.title}
          </h1>

          {/* Movie Metadata Strip */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold mb-3.5 sm:mb-6 transition-colors duration-200',
              isDark ? 'text-gray-300' : 'text-gray-600'
            )}
          >
            {current.imdb_rating && (
              <span
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md border font-black text-[11px] sm:text-xs',
                  isDark
                    ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                )}
              >
                <Star size={12} fill="#fcd34d" />
                {current.imdb_rating.toFixed(1)} IMDb
              </span>
            )}

            <span
              className={cn(
                'px-1.5 py-0.5 rounded border font-bold text-[10px] sm:text-xs',
                isDark
                  ? 'bg-white/10 border-white/15 text-white'
                  : 'bg-gray-200/80 border-gray-300 text-gray-800'
              )}
            >
              {current.age_rating || '15'}
            </span>

            <span className="text-[11px] sm:text-xs">{current.release_year}</span>

            {current.runtime_minutes && (
              <>
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>&bull;</span>
                <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                  <Clock size={11} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                  {formatRuntime(current.runtime_minutes)}
                </span>
              </>
            )}

            {current.genres?.[0] && (
              <>
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>&bull;</span>
                <span className="text-brand-blue font-bold text-[11px] sm:text-xs">{current.genres[0].name}</span>
              </>
            )}
          </div>

          {/* CTA Buttons Row: Side-by-side 1-row grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-4 w-full sm:w-auto">
            <Link
              to={`/product/${current.slug}`}
              className={cn(
                'flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all shadow-xl active:scale-95 cursor-pointer text-center whitespace-nowrap',
                isDark
                  ? 'bg-white text-dark hover:bg-gray-100 hover:shadow-2xl'
                  : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-2xl'
              )}
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
            <div
              className={cn(
                'absolute -inset-3 rounded-3xl blur-2xl pointer-events-none -z-10 transition-opacity duration-500',
                isDark
                  ? 'bg-gradient-to-tr from-brand-blue/25 via-white/10 to-amber-400/20 opacity-60 group-hover:opacity-90'
                  : 'bg-gradient-to-tr from-brand-blue/15 via-black/5 to-amber-400/15 opacity-40 group-hover:opacity-70'
              )}
            />

            {/* 3D Physical DVD Case Container */}
            <Link
              to={`/product/${current.slug}`}
              className={cn(
                'block relative w-[190px] sm:w-[220px] lg:w-[250px] aspect-[2/3] rounded-2xl overflow-hidden group cursor-pointer animate-hero-card-float transition-all duration-500 hover:scale-[1.03]',
                isDark
                  ? 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border-2 border-white/25 ring-1 ring-white/10 hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,1)]'
                  : 'shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] border-2 border-gray-300 ring-1 ring-black/5 hover:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.3)]'
              )}
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
              <div
                className={cn(
                  'absolute bottom-2 left-2 right-2 p-2 rounded-lg backdrop-blur-md border flex items-center justify-between text-[11px] font-bold transition-colors duration-300',
                  isDark
                    ? 'bg-black/85 border-white/15 text-white group-hover:border-white/30'
                    : 'bg-white/90 border-gray-200 text-gray-900 group-hover:border-gray-300 shadow-sm'
                )}
              >
                <span className="truncate">{current.format || 'DVD'}</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-mono">{formatGBP(current.price)}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Desktop Slider Navigation Controls & Audio Toggle (Desktop only) ── */}
      <div className="hidden sm:flex absolute bottom-4 left-4 sm:left-8 right-4 sm:right-8 z-20 pointer-events-none items-center justify-between gap-4">
        {featured.length > 1 ? (
          <div
            className={cn(
              'flex items-center gap-2 pointer-events-auto backdrop-blur-md px-3 py-1.5 rounded-full border transition-colors',
              isDark
                ? 'bg-black/60 border-white/10'
                : 'bg-white/80 border-gray-200 shadow-sm'
            )}
          >
            {featured.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => gotoSlide(idx)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300 cursor-pointer',
                  idx === activeIndex
                    ? 'w-7 bg-brand-blue'
                    : isDark
                      ? 'w-2 bg-white/30 hover:bg-white/70'
                      : 'w-2 bg-gray-300 hover:bg-gray-500'
                )}
                aria-label={`Switch to movie ${idx + 1}: ${item.title}`}
              />
            ))}
          </div>
        ) : <div />}

        {isVideoActive && (
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold shadow-xl transition-all cursor-pointer pointer-events-auto active:scale-95',
              isDark
                ? 'bg-black/70 hover:bg-black/90 border-white/20 text-white'
                : 'bg-white/90 hover:bg-white border-gray-200 text-gray-800 shadow-md'
            )}
            title={isMuted ? 'Turn Sound On' : 'Mute Background Video'}
          >
            {isMuted ? (
              <>
                <VolumeX size={14} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
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
