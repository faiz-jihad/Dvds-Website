import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';

const compiled = new Map();
async function load(entry, globals) {
  if (!compiled.has(entry)) {
    const result = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs',
      plugins: [{ name: 'intro-gsap', setup(b) {
        b.onResolve({ filter: /^gsap$/ }, () => ({ path: 'gsap', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const gsap = globalThis.gsap;' }));
      } }],
    });
    compiled.set(entry, result.outputFiles[0].text);
  }
  const context = { module: { exports: {} }, ...globals };
  vm.runInNewContext(compiled.get(entry), context);
  return context.module.exports;
}

function environment({ ready = true, assetLoaded = true, mobile = false, failAnimation = false } = {}) {
  class Element extends EventTarget {
    style = {}; isConnected = true; inert = false; complete = assetLoaded; readyState = assetLoaded ? 2 : 0;
    focus() { doc.activeElement = this; }
    contains(other) { return other === this; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
  }
  class Image extends Element {}
  class Video extends Element {}
  const doc = new EventTarget();
  doc.body = new Element(); doc.body.style = { overflow: 'auto', paddingRight: '6px' };
  doc.documentElement = { clientWidth: 1000 };
  doc.fonts = { status: 'loaded' };
  const mediaQuery = new EventTarget(); mediaQuery.matches = false;
  const timers = new Map();
  const calls = [];
  const timelines = [];
  const observers = [];
  const image = new Image();
  const logo = new Image(); logo.complete = true;
  const title = new Element();
  const nav = new Element();
  const hero = new Element();
  hero.querySelector = (selector) => selector.includes('media') ? image : null;
  hero.querySelectorAll = () => [title];
  const link = new Element();
  const content = new Element();
  content.contains = (el) => el === link;
  content.querySelector = (selector) => selector.includes('ready') ? (ready ? hero : null)
    : selector.includes('hero') ? hero : selector.includes('nav') ? nav : selector.startsWith('a[') ? link : null;
  const skip = new Element();
  const overlay = new Element();
  overlay.querySelector = (selector) => selector === 'img' ? logo : selector === 'button' ? skip : new Element();
  overlay.contains = (el) => el === skip;
  const gsap = {
    context(fn) { fn(); return { add(fn) { fn(); }, revert() { calls.push('revert'); } }; },
    set(target, vars) { calls.push({ set: target, vars }); },
    timeline(options) {
      if (failAnimation) throw Error('Animation initialization failed');
      const timeline = {
        options, stopped: false, position: 0, entries: [],
        to(target, vars, at) { this.entries.push({ target, vars, at }); return this; },
        addPause(at, callback) { this.gate = at; this.onGate = callback; return this; },
        paused() { return this.stopped; }, time() { return this.position; },
        play() { this.stopped = false; return this; },
        reachGate() { this.position = this.gate; this.stopped = true; this.onGate(); },
      };
      timelines.push(timeline); return timeline;
    },
  };
  const globals = {
    window: { innerWidth: 1010, matchMedia: (query) => query.includes('640') ? { matches: mobile } : mediaQuery },
    document: doc, gsap, HTMLImageElement: Image, HTMLVideoElement: Video,
    getComputedStyle: () => ({ paddingRight: '6px' }),
    setTimeout: (fn, ms) => { const id = {}; timers.set(id, { fn, ms }); return id; },
    clearTimeout: (id) => timers.delete(id),
    MutationObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } },
  };
  let completed = 0;
  return { globals, doc, content, overlay, image, skip, link, mediaQuery, timers, calls, timelines, observers,
    get completed() { return completed; },
    async start() {
      const { startIntro } = await load('src/components/intro/introTimeline.ts', globals);
      return startIntro(new Element(), content, overlay, () => { completed += 1; });
    },
    timer(ms) { return [...timers.values()].find((timer) => timer.ms === ms); },
  };
}

test('intro gates the handoff on critical media and caps desktop/mobile duration', async () => {
  for (const mobile of [false, true]) {
    const env = environment({ assetLoaded: false, mobile });
    const control = await env.start();
    const tl = env.timelines[0];
    tl.reachGate();
    assert.equal(tl.paused(), true);
    env.image.dispatchEvent(new Event('loadeddata')); // An image must wait for its own load event.
    assert.equal(tl.paused(), true);
    env.image.dispatchEvent(new Event('load'));
    assert.equal(tl.paused(), false);
    const duration = Math.max(...tl.entries.map(({ at, vars }) => at + vars.duration));
    assert.ok(duration + (mobile ? 1.55 : 1.9) - tl.gate <= 4);
    tl.entries.find(({ target }) => target === env.overlay).vars.onComplete();
    assert.equal(env.content.inert, false, 'interaction resumes as soon as the curtain clears');
    assert.equal(env.completed, 0, 'hero can finish without blocking the page');
    tl.options.onComplete();
    assert.equal(env.completed, 1);
    assert.equal(env.doc.body.style.overflow, 'auto');
    assert.equal(env.doc.body.style.paddingRight, '6px');
    assert.equal(env.content.inert, false);
    assert.equal(env.timers.size, 0);
    assert.equal(env.overlay.style.visibility, 'hidden', 'reverting transforms must not flash the curtain');
    control.finish();
    assert.equal(env.completed, 1);
  }
});

test('failed media and missing/late homepage content cannot leave the page locked', async () => {
  const broken = environment({ assetLoaded: false });
  await broken.start(); broken.timelines[0].reachGate();
  broken.image.dispatchEvent(new Event('error'));
  assert.equal(broken.timelines[0].paused(), false);
  broken.timelines[0].options.onComplete();
  const missing = environment({ ready: false });
  await missing.start(); missing.timelines[0].reachGate();
  missing.timer(1900).fn();
  assert.equal(missing.timelines[0].paused(), false);
  missing.timer(4200).fn();
  assert.equal(missing.content.inert, false);
  assert.equal(missing.doc.body.style.overflow, 'auto');
});

test('Escape and live reduced-motion changes release focus, scroll and all resources', async () => {
  for (const method of ['escape', 'motion', 'background']) {
    const env = environment();
    await env.start();
    assert.equal(env.content.inert, true);
    assert.equal(env.doc.body.style.overflow, 'hidden');
    env.doc.activeElement = env.skip;
    if (method === 'escape') {
      const event = new Event('keydown'); event.key = 'Escape'; env.doc.dispatchEvent(event);
    } else if (method === 'motion') {
      env.mediaQuery.matches = true; env.mediaQuery.dispatchEvent(new Event('change'));
    } else {
      env.doc.hidden = true; env.doc.dispatchEvent(new Event('visibilitychange'));
    }
    assert.equal(env.completed, 1);
    assert.equal(env.doc.activeElement, env.link);
    assert.equal(env.doc.body.style.overflow, 'auto');
    assert.equal(env.content.inert, false);
    assert.equal(env.timers.size, 0);
  }
});

test('StrictMode-style teardown/remount restores original state without consuming the intro', async () => {
  const env = environment();
  const first = await env.start(); first.dispose(); first.dispose();
  assert.equal(env.completed, 0);
  assert.equal(env.doc.body.style.overflow, 'auto');
  assert.equal(env.content.inert, false);
  assert.equal(env.timers.size, 0);
  const second = await env.start();
  assert.equal(env.content.inert, true);
  second.finish();
  assert.equal(env.completed, 1);
  assert.equal(env.doc.body.style.paddingRight, '6px');
  assert.equal(env.calls.filter((call) => call === 'revert').length, 2);
});

test('animation initialization failure exposes page content and restores scrolling', async () => {
  const env = environment({ failAnimation: true });
  await env.start();
  assert.equal(env.completed, 1);
  assert.equal(env.doc.body.style.overflow, 'auto');
  assert.equal(env.content.inert, false);
  assert.equal(env.calls.filter((call) => call === 'revert').length, 1);
});

test('session policy skips non-home routes, returning visitors and reduced motion; blocked storage remains usable', async () => {
  const storage = new Map();
  const window = { matchMedia: () => ({ matches: false }), sessionStorage: {
    getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value),
  } };
  const session = await load('src/components/intro/introSession.ts', { window });
  assert.equal(session.shouldPlayIntro(false), false);
  assert.equal(session.shouldPlayIntro(true), true);
  session.rememberIntro();
  assert.equal(session.shouldPlayIntro(true), false);
  const refreshed = await load('src/components/intro/introSession.ts', { window });
  assert.equal(refreshed.shouldPlayIntro(true), false);
  window.sessionStorage.getItem = () => { throw Error('Storage denied'); };
  window.sessionStorage.setItem = () => { throw Error('Storage denied'); };
  const privateMode = await load('src/components/intro/introSession.ts', { window });
  assert.equal(privateMode.shouldPlayIntro(true), true);
  privateMode.rememberIntro();
  assert.equal(privateMode.shouldPlayIntro(true), false);
  const reduced = await load('src/components/intro/introSession.ts', { window: { ...window, matchMedia: () => ({ matches: true }) } });
  assert.equal(reduced.shouldPlayIntro(true), false);
});
