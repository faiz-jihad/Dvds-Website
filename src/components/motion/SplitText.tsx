import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '../../lib/formatters';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export const SplitText: React.FC<SplitTextProps> = ({ text, className, delay = 0.12 }) => {
  const reduceMotion = useReducedMotion();
  const words = text.trim().split(/\s+/);

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delay,
        staggerChildren: 0.075,
      },
    },
  };

  const word: Variants = {
    hidden: { y: '115%', opacity: 0, rotate: 2 },
    visible: {
      y: '0%',
      opacity: 1,
      rotate: 0,
      transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.h1
      aria-label={text}
      className={cn(className)}
      initial={reduceMotion ? false : 'hidden'}
      animate={reduceMotion ? undefined : 'visible'}
      variants={container}
    >
      {words.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          <span aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-[0.06em] -mb-[0.06em]">
            <motion.span className="inline-block will-change-transform" variants={word}>
              {item}
            </motion.span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </motion.h1>
  );
};
