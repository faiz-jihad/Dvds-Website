import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/formatters';

type RevealDirection = 'up' | 'down' | 'left' | 'right';

interface AnimatedContentProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  direction?: RevealDirection;
  duration?: number;
  once?: boolean;
  disabled?: boolean;
}

export const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  className,
  delay = 0,
  distance = 34,
  direction = 'up',
  duration = 0.72,
  once = true,
  disabled = false,
}) => {
  const reduceMotion = useReducedMotion();
  const offset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  }[direction];

  return (
    <motion.div
      className={cn(className)}
      initial={reduceMotion || disabled ? false : { opacity: 0, filter: 'blur(8px)', ...offset }}
      whileInView={reduceMotion || disabled ? undefined : { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 }}
      viewport={{ once, amount: 0.12, margin: '0px 0px -6% 0px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
