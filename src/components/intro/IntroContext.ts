import { createContext, useContext, useRef } from 'react';

export const IntroContext = createContext(false);

// Freeze ownership per mount: the hero must not replay its own entry animation
// when the coordinated intro finishes and context becomes false.
export function useIntroEntry() {
  const active = useContext(IntroContext);
  return useRef(active).current;
}
