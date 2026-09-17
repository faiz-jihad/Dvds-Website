import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Shield, Disc3, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform, useInView, useReducedMotion } from 'framer-motion';

export const SpykerManifestoVideo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const prefersReduced = useReducedMotion();

  // Scroll tracking for silky cinematic scaling and parallax
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Dynamic transforms based on scroll
  const videoScale = useTransform(scrollYProgress, [0.1, 0.45, 0.85], [0.92, 1, 0.98]);
  const videoY = useTransform(scrollYProgress, [0.1, 0.5, 0.9], [40, 0, -30]);
  const videoOpacity = useTransform(scrollYProgress, [0.05, 0.3], [0.5, 1]);
  const ambientGlowOpacity = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0.15, 0.35, 0.15]);

  // Smart In-View detection for auto-play/pause on scroll
  const isInView = useInView(containerRef, { amount: 0.3 });

  useEffect(() => {
    if (!videoRef.current) return;
    if (isInView) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isInView]);

  // Sync state on timeupdate
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Sync duration on metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const pillars = [
    {
      id: '01',
      title: 'UNCOMPRESSED BITRATE',
      desc: 'No dynamic bandwidth throttling, Wi-Fi buffering drops, or streaming compression. Optical media guarantees pristine bitrate transmission directly from the laser diode with uncompressed multi-channel audio.',
    },
    {
      id: '02',
      title: 'SOVEREIGN OWNERSHIP',
      desc: 'Digital streaming licenses are temporary and subject to sudden removal. A physical DVD collection is tangible, sovereign property. Once on your shelf, no corporate studio can ever edit or revoke your copies.',
    },
    {
      id: '03',
      title: 'CURATED ARCHIVES',
      desc: 'Every edition in our catalogue is inspected for disc integrity, packaged in collector-grade slipcases with original sleeve art, and dispatched directly from our UK archival vault via Royal Mail Tracked 24.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#040507] text-white py-24 sm:py-36 border-b border-white/[0.08] overflow-hidden"
    >
      {/* Dynamic Background Ambient Lighting that pulses with scroll */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: prefersReduced ? 0.2 : ambientGlowOpacity,
          background:
            'radial-gradient(circle 800px at 50% 45%, rgba(25, 50, 85, 0.45) 0%, transparent 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section with Smooth Scroll Reveal */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 35, filter: 'blur(6px)' }}
          whileInView={prefersReduced ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-6 h-px bg-white/40" />
            <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-white/60">
              THE CINEMA MANIFESTO
            </span>
            <span className="w-6 h-px bg-white/40" />
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[0.92]">
            FILMS WORTH OWNING. <br />
            <span className="text-white/40">PRESERVED ON DISC.</span>
          </h2>
          <p className="mt-4 text-xs sm:text-sm font-mono tracking-widest text-white/50 uppercase">
            True Cinema Permanence • Master Quality Audio & Visuals • Sovereign Ownership
          </p>
        </motion.div>

        {/* 2.39:1 Cinema Frame Video Container with Scroll Scaling & Parallax */}
        <motion.div
          ref={containerRef}
          style={{
            scale: prefersReduced ? 1 : videoScale,
            y: prefersReduced ? 0 : videoY,
            opacity: prefersReduced ? 1 : videoOpacity,
          }}
          className="group relative rounded-2xl overflow-hidden border border-white/[0.14] bg-[#07090d] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] aspect-[16/9] md:aspect-[2.39/1] max-w-6xl mx-auto will-change-transform transition-shadow duration-500 hover:border-white/25 hover:shadow-[0_30px_90px_-20px_rgba(20,50,90,0.35)]"
        >
          {/* Active Cinema Video element with same master footage as homepage */}
          <div className="absolute inset-0 overflow-hidden">
            <video
              ref={videoRef}
              src="https://res.cloudinary.com/lsrzjokx/video/upload/v1789362877/use_english_dan_jangan_ada_tex_gwr_video_mvp.mp4"
              playsInline
              loop
              muted={isMuted}
              autoPlay
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-cover"
            />
            {/* Cinematic Vignette & Ambient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#040507]/90 via-black/30 to-[#040507]/70 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#040507]/80 via-transparent to-[#040507]/80 pointer-events-none" />
          </div>

          {/* Film Grain Texture simulation */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Top Bar HUD Info */}
          <div className="absolute top-0 inset-x-0 p-3 sm:p-6 flex items-center justify-between text-xs font-mono text-white/70 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="tracking-widest uppercase text-[9px] sm:text-xs">
                MASTER ARCHIVE FEED • 24 FPS
              </span>
            </div>
            <div className="hidden sm:block tracking-widest text-[10px] sm:text-xs text-white/50">
              DVDS ZONE VAULT MASTER REEL
            </div>
          </div>

          {/* Center Cinematic Typography & Play/Pause Trigger */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
            <button
              type="button"
              onClick={togglePlay}
              className="pointer-events-auto mb-5 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
              aria-label={isPlaying ? 'Pause film' : 'Play film'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 sm:w-8 sm:h-8" />
              ) : (
                <Play className="w-6 h-6 sm:w-8 sm:h-8 translate-x-0.5" />
              )}
            </button>

            <span className="text-[10px] sm:text-xs font-mono tracking-[0.35em] text-white/70 uppercase mb-2 drop-shadow-sm">
              THE ART OF PHYSICAL CINEMA
            </span>
            <h3 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase text-white max-w-2xl leading-[0.95] drop-shadow-md">
              PERMANENCE IS TRUE LUXURY.
            </h3>
          </div>

          {/* Bottom Custom Playback Controls HUD */}
          <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10">
            {/* Interactive Scrubber progress bar */}
            <div
              onClick={handleSeek}
              className="w-full bg-white/20 hover:bg-white/30 h-1.5 rounded-full overflow-hidden mb-3.5 cursor-pointer transition-colors relative"
              title="Click to seek"
            >
              <div
                className="bg-white h-full transition-all duration-150 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="hover:text-white text-white/80 transition-colors cursor-pointer p-1"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="hover:text-white text-white/80 transition-colors cursor-pointer p-1"
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="text-white/60 tracking-wider">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] tracking-widest uppercase text-white/40 hidden sm:inline">
                  2.39:1 CINEMA MASTER
                </span>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="hover:text-white text-white/80 transition-colors cursor-pointer p-1"
                  aria-label="Toggle Fullscreen"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* The 3 Physical Media Craft Pillars with Staggered Scroll Entrance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-16 max-w-6xl mx-auto border-t border-white/[0.08] pt-12">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.id}
              initial={prefersReduced ? false : { opacity: 0, y: 30, filter: 'blur(4px)' }}
              whileInView={prefersReduced ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.75,
                delay: index * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group flex flex-col p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-white/40 font-bold group-hover:text-amber-300 transition-colors">
                  {pillar.id}
                </span>
                <div className="w-8 h-px bg-white/20 group-hover:w-12 group-hover:bg-amber-300/60 transition-all duration-300" />
                <h4 className="text-xs font-mono tracking-widest uppercase text-white font-semibold group-hover:text-white transition-colors">
                  {pillar.title}
                </h4>
              </div>
              <p className="text-sm text-white/60 leading-relaxed font-light group-hover:text-white/80 transition-colors">
                {pillar.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpykerManifestoVideo;
