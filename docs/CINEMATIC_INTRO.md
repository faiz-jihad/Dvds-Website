# Cinematic homepage entry

The entry is integrated into `RootLayout` by `components/intro/IntroLoader.tsx`.
The existing homepage layout, copy, navigation, and SEO stay in place. Both
`SpykerHero` and the published CMS `HeroSection` participate in the same GSAP
timeline through explicit `data-intro-*` attributes.

## Sequence

- Black viewport with only the existing monochrome logo fading in and gently
  scaling up. No percentage, progress line, disc decoration or tagline.
- The first phase lasts 1.65 seconds on desktop and 1.4 seconds on mobile.
- The handoff checks the rendered homepage, primary hero media, logo and fonts.
  Slow assets stop gating at 1.9 seconds (1.55 on mobile).
- After the logo reveal and a 160ms hold, the curtain rises. Media, headline, description,
  CTA and navigation enter in sequence. The whole timeline takes approximately
  3–3.7 seconds. Scroll and keyboard access return when the curtain clears,
  while the last portion of the media zoom finishes.
- A 4.2-second emergency fallback releases the page if animation stalls.

## Lifecycle and accessibility

- Runs only on the initial homepage entry, once per tab session. Returning
  navigation does not replay it. The session key is `az-rayan:intro:v1`.
- Storage failures fall back to in-memory completion tracking.
- `prefers-reduced-motion: reduce` skips the intro entirely; changing that
  preference during playback also releases the page.
- Skip intro and Escape always provide an exit. Hidden page controls are inert
  during the curtain. Focus returns to the page if it was on the skip button.
- Body overflow and scrollbar compensation are restored on completion, skip,
  route changes, unmount, backgrounding, and initialization failure.
- GSAP context, observers, event listeners and deadlines are cleaned up on
  teardown. Teardown alone does not consume the session, allowing React
  StrictMode to mount the effect again.
- Existing hero entry animations yield to the intro for that component mount,
  avoiding a second GSAP/Framer Motion reveal after completion.

## Verification

`tests/intro.test.mjs` exercises timing bounds, asset errors, deadlines, session
storage, focus/scroll restoration, reduced motion, and setup/teardown/remount
using a mocked DOM and animation scheduler. The regular homepage rendering tests
cover the published-layout path. Run `npm test` and `npm run build`.

Browser visual checks are still required on desktop and mobile: no connected
browser was available in this workspace session. In a fresh tab session, verify
the logo, curtain and hero handoff; refresh to verify session skipping; then
check reduced motion, Escape, slow media, navbar clicks and scroll restoration.
