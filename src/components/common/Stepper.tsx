import React, { useState, Children, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Stepper.css';

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  initialStep?: number;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  backButtonText?: string;
  nextButtonText?: string;
  disableStepIndicators?: boolean;
  hideFooter?: boolean;
  renderStepIndicator?: (props: {
    step: number;
    currentStep: number;
    onStepClick: (clicked: number) => void;
  }) => React.ReactNode;
}

export default function Stepper({
  children,
  initialStep = 1,
  currentStep: controlledStep,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  disableStepIndicators = false,
  hideFooter = false,
  renderStepIndicator,
  className = '',
  ...rest
}: StepperProps) {
  const [internalStep, setInternalStep] = useState(controlledStep ?? initialStep);
  const [direction, setDirection] = useState(0);

  const activeStep = controlledStep ?? internalStep;

  useEffect(() => {
    if (controlledStep !== undefined && controlledStep !== internalStep) {
      setDirection(controlledStep > internalStep ? 1 : -1);
      setInternalStep(controlledStep);
    }
  }, [controlledStep, internalStep]);

  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = activeStep > totalSteps;
  const isLastStep = activeStep === totalSteps;

  const updateStep = (newStep: number) => {
    setInternalStep(newStep);
    if (newStep > totalSteps) {
      onFinalStepCompleted();
    } else {
      onStepChange(newStep);
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setDirection(-1);
      updateStep(activeStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(activeStep + 1);
    }
  };

  const handleComplete = () => {
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  return (
    <div className={`stepper-outer-container ${className}`} {...rest}>
      <div
        className={`step-circle-container ${stepCircleContainerClassName}`}
      >
        <div className={`step-indicator-row ${stepContainerClassName}`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep: activeStep,
                    onStepClick: (clicked) => {
                      setDirection(clicked > activeStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={activeStep}
                    onClickStep={(clicked) => {
                      setDirection(clicked > activeStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={activeStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>

        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={activeStep}
          direction={direction}
          className={`step-content-default ${contentClassName}`}
        >
          {stepsArray[Math.min(activeStep - 1, totalSteps - 1)]}
        </StepContentWrapper>

        {!isCompleted && !hideFooter && (
          <div className={`footer-container ${footerClassName}`}>
            <div className={`footer-nav ${activeStep !== 1 ? 'spread' : 'end'}`}>
              {activeStep !== 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`back-button ${activeStep === 1 ? 'inactive' : ''}`}
                  {...backButtonProps}
                >
                  {backButtonText}
                </button>
              )}
              <button
                type="button"
                onClick={isLastStep ? handleComplete : handleNext}
                className="next-button"
                {...nextButtonProps}
              >
                {isLastStep ? 'Complete' : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
  className,
}: {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: React.ReactNode;
  className: string;
}) {
  const [parentHeight, setParentHeight] = useState<number | 'auto'>('auto');

  return (
    <motion.div
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: 'spring', duration: 0.4 }}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition
            key={currentStep}
            direction={direction}
            onHeightReady={(h) => setParentHeight(h)}
          >
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({
  children,
  direction,
  onHeightReady,
}: {
  children: React.ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      onHeightReady(containerRef.current.offsetHeight);
    }
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'relative', width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -30 : 30,
    opacity: 0,
  }),
};

export function Step({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`step-default ${className}`}>{children}</div>;
}

function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators,
}: {
  step: number;
  currentStep: number;
  onClickStep: (step: number) => void;
  disableStepIndicators?: boolean;
}) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  return (
    <motion.div
      onClick={handleClick}
      className="step-indicator"
      style={disableStepIndicators ? { pointerEvents: 'none' } : {}}
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: '#F3F4F6', color: '#9CA3AF' },
          active: { scale: 1.08, backgroundColor: '#1769E0', color: '#FFFFFF' },
          complete: { scale: 1, backgroundColor: '#10B981', color: '#FFFFFF' },
        }}
        transition={{ duration: 0.3 }}
        className="step-indicator-inner"
      >
        {status === 'complete' ? (
          <CheckIcon className="check-icon" />
        ) : status === 'active' ? (
          <div className="active-dot" />
        ) : (
          <span className="step-number">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants = {
    incomplete: { width: '0%', backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: '#10B981' },
  };

  return (
    <div className="step-connector">
      <motion.div
        className="step-connector-inner"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
