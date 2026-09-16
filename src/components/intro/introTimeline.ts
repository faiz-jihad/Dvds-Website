import { gsap } from 'gsap';

/** One bounded timeline. Readiness gates only the handoff, never page access indefinitely. */
export function startIntro(root: HTMLElement, content: HTMLElement, overlay: HTMLElement, onComplete: () => void) {
  const mobile = window.matchMedia('(max-width: 640px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const previousOverflow = body.style.overflow;
  const previousPadding = body.style.paddingRight;
  const previousInert = content.inert;
  const previousFocus = document.activeElement as HTMLElement | null;
  const skip = overlay.querySelector<HTMLButtonElement>('button');
  const listeners: (() => void)[] = [];
  let disposed = false;
  let unlocked = false;
  let released = false;
  let discovered = false;
  let pendingAssets = 0;
  let context: gsap.Context | undefined;
  let timeline: gsap.core.Timeline | undefined;
  let observer: MutationObserver | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let failsafe: ReturnType<typeof setTimeout> | undefined;

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    body.style.overflow = previousOverflow;
    body.style.paddingRight = previousPadding;
    content.inert = previousInert;
    if (overlay.contains(document.activeElement)) {
      const target = previousFocus && content.contains(previousFocus) && previousFocus.isConnected
        ? previousFocus : content.querySelector<HTMLElement>('a[href],button:not([disabled])');
      target?.focus({ preventScroll: true });
    }
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(deadline);
    clearTimeout(failsafe);
    observer?.disconnect();
    listeners.forEach((remove) => remove());
    try { context?.revert(); }
    finally { unlock(); }
  };
  const finish = () => {
    if (disposed) return;
    try { cleanup(); }
    finally {
      // context.revert() resets the curtain's transform; hide it synchronously
      // before React removes it so there cannot be a one-frame black flash.
      overlay.style.visibility = 'hidden';
      onComplete();
    }
  };
  const listen = (target: EventTarget, event: string, handler: EventListener) => {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  };
  const release = () => {
    if (disposed) return;
    released = true;
    if (timeline?.paused()) timeline.play();
  };
  const settle = () => {
    pendingAssets -= 1;
    if (discovered && pendingAssets === 0) release();
  };
  const watchAsset = (asset: HTMLImageElement | HTMLVideoElement) => {
    if (asset instanceof HTMLImageElement ? asset.complete : asset.readyState >= 2) return;
    pendingAssets += 1;
    let settled = false;
    const done = () => { if (!settled) { settled = true; settle(); } };
    listen(asset, asset instanceof HTMLImageElement ? 'load' : 'loadeddata', done);
    listen(asset, 'error', done);
  };

  try {
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gutter > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
    content.inert = true;
    if (previousFocus && content.contains(previousFocus)) skip?.focus({ preventScroll: true });
    listen(document, 'keydown', (event) => { if ((event as KeyboardEvent).key === 'Escape') finish(); });
    listen(document, 'visibilitychange', () => { if (document.hidden) finish(); });
    listen(reduced, 'change', () => { if (reduced.matches) finish(); });

    const gate = mobile ? 1.4 : 1.65;
    const reveal = gate + .34;
    context = gsap.context(() => {}, root);
    context.add(() => {
      const logo = overlay.querySelector('.intro-loader__identity');
      const disc = overlay.querySelector('.intro-loader__disc');
      const progress = overlay.querySelector('.intro-loader__progress');
      const counter = overlay.querySelector('.intro-loader__counter');
      const fill = overlay.querySelector('.intro-loader__fill');
      const navbar = content.querySelector('[data-intro-nav]');
      const count = { value: 0 };
      const updateCount = () => { if (counter) counter.textContent = `${Math.round(count.value).toString().padStart(2, '0')}%`; };
      timeline = gsap.timeline({ onComplete: finish });
      gsap.set(navbar, { opacity: 0, y: -10, transition: 'none' });
      timeline
        .to(logo, { opacity: 1, y: 0, scale: 1, duration: mobile ? .95 : 1.2, ease: 'power4.out' }, 0)
        .to(disc, { rotation: 18, duration: gate + .2, ease: 'sine.inOut', transformOrigin: '50% 50%' }, 0)
        .to(fill, { scaleX: .85, duration: gate, ease: 'power1.inOut' }, 0)
        .to(count, { value: 85, duration: gate, ease: 'power1.inOut', onUpdate: updateCount }, 0)
        .addPause(gate, () => { if (released) timeline?.play(); })
        .to(fill, { scaleX: 1, duration: .18, ease: 'power1.out' }, gate)
        .to(count, { value: 100, duration: .18, ease: 'power1.out', onUpdate: updateCount }, gate)
        .to(logo, { opacity: 0, scale: 1.06, duration: .4, ease: 'power2.in' }, reveal)
        .to(progress, { opacity: 0, duration: .25 }, reveal)
        .to(overlay, { yPercent: -100, duration: mobile ? .85 : 1.05, ease: 'expo.inOut', onComplete: unlock }, reveal)
        .to(navbar, { opacity: 1, y: 0, duration: .8, ease: 'power4.out' }, reveal + .65);
    });

    const discoverHero = () => {
      if (disposed || discovered || !content.querySelector('[data-intro-ready]')) return;
      discovered = true;
      observer?.disconnect();
      const hero = content.querySelector('[data-intro-hero]');
      const media = hero?.querySelector('[data-intro-media]');
      const headings = hero?.querySelectorAll('[data-intro-title]');
      const description = hero?.querySelectorAll('[data-intro-description]');
      const cta = hero?.querySelectorAll('[data-intro-cta]');
      // Late content after the deadline is left visible, never hidden offscreen.
      if (timeline && timeline.time() < reveal) context?.add(() => {
        if (media) {
          gsap.set(media, { scale: mobile ? 1.06 : 1.1, transformOrigin: '50% 50%' });
          timeline!.to(media, { scale: 1, duration: mobile ? 1.35 : 1.65, ease: 'power4.out' }, reveal);
        }
        if (headings?.length) {
          gsap.set(headings, { yPercent: 110 });
          timeline!.to(headings, { yPercent: 0, duration: .9, stagger: .08, ease: 'power4.out' }, reveal + .18);
        }
        if (description?.length) {
          gsap.set(description, { opacity: 0, y: mobile ? 8 : 16 });
          timeline!.to(description, { opacity: 1, y: 0, duration: .7, ease: 'power4.out' }, reveal + .4);
        }
        if (cta?.length) {
          gsap.set(cta, { opacity: 0, y: 12 });
          timeline!.to(cta, { opacity: 1, y: 0, duration: .65, ease: 'power4.out' }, reveal + .55);
        }
      });
      const assets = [overlay.querySelector('img'), hero?.querySelector('[data-intro-media] img, img[data-intro-media], video[data-intro-media]')];
      assets.forEach((asset) => { if (asset instanceof HTMLImageElement || asset instanceof HTMLVideoElement) watchAsset(asset); });
      if (document.fonts?.status === 'loading') {
        pendingAssets += 1;
        document.fonts.ready.then(settle, settle);
      }
      if (pendingAssets === 0) release();
    };
    observer = new MutationObserver(() => {
      try { discoverHero(); } catch { finish(); }
    });
    observer.observe(content, { childList: true, subtree: true });
    discoverHero();
    // Asset failures / slow connections must not extend the entry beyond ~4s.
    deadline = setTimeout(release, mobile ? 1550 : 1900);
    failsafe = setTimeout(finish, 4200);
    if (reduced.matches) finish();
  } catch { finish(); }

  return { finish, dispose: cleanup };
}
