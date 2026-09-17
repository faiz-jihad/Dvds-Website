import React, { useLayoutEffect, useRef, useState } from 'react';
import { IntroContext } from './IntroContext';
import { rememberIntro, shouldPlayIntro } from './introSession';
import { startIntro } from './introTimeline';
import './IntroLoader.css';

export const IntroLoader: React.FC<React.PropsWithChildren<{ home: boolean }>> = ({ home, children }) => {
  const [active, setActive] = useState(() => shouldPlayIntro(home));
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const stop = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    if (!active || !home || !root.current || !content.current || !overlay.current) return;
    const control = startIntro(root.current, content.current, overlay.current, () => {
      rememberIntro();
      setActive(false);
    });
    stop.current = control.finish;
    return () => { stop.current = null; control.dispose(); };
  }, [active, home]);

  useLayoutEffect(() => {
    if (!home && active) { rememberIntro(); setActive(false); }
  }, [home, active]);

  return (
    <IntroContext.Provider value={active && home}>
      <div ref={root}>
        <div ref={content}>{children}</div>
        {active && home && <div ref={overlay} className="intro-loader" aria-label="DVDs Zone introduction">
          <div className="intro-loader__identity" aria-hidden="true">
            <img className="intro-loader__logo" src="/brand/logo-transparent.png" alt="" width="577" height="433" fetchPriority="high" />

          </div>
          <span className="sr-only" role="status">Preparing DVDs Zone. Press Escape to skip the introduction.</span>
          <button type="button" className="intro-loader__skip" onClick={() => stop.current?.()}>Skip intro</button>
        </div>}
      </div>
    </IntroContext.Provider>
  );
};
