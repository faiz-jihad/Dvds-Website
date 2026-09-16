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
        {active && home && <div ref={overlay} className="intro-loader" aria-label="AZ Rayan DVDs introduction">
          <div className="intro-loader__identity" aria-hidden="true">
            <img className="intro-loader__logo" src="/brand/logo-transparent.png" alt="" width="577" height="433" fetchPriority="high" />
            <div className="intro-loader__edition">
              <svg className="intro-loader__disc" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth=".6" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth=".6" />
                <path d="M15.5 4.2a8.5 8.5 0 0 1 4.3 4.3M4.2 15.5a8.5 8.5 0 0 0 4.3 4.3" stroke="#e5e5e2" strokeWidth=".8" />
              </svg>
              <span>DVDs · Films worth owning</span>
            </div>
          </div>
          <span className="sr-only" role="status">Preparing AZ Rayan DVDs. Press Escape to skip the introduction.</span>
          <div className="intro-loader__progress" aria-hidden="true">
            <span>00%</span>
            <span className="intro-loader__track"><span className="intro-loader__fill" /></span>
            <span className="intro-loader__counter">00%</span>
          </div>
          <button type="button" className="intro-loader__skip" onClick={() => stop.current?.()}>Skip intro</button>
        </div>}
      </div>
    </IntroContext.Provider>
  );
};
