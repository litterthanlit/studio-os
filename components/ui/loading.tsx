'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Skeleton ---
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-[#F4F8FF]",
        "bg-[linear-gradient(110deg,#F4F8FF_20%,#E8F0FE_50%,#F4F8FF_80%)] bg-[length:200%_100%] animate-[shimmer_1.2s_linear_infinite]",
        className
      )}
      {...props}
    />
  );
}

// --- ProgressBar ---
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  progress?: number; // 0 to 100
}

export function ProgressBar({ progress = 0, className, ...props }: ProgressBarProps) {
  return (
    <div
      className={cn("h-[3px] w-full overflow-hidden rounded-full bg-border-primary", className)}
      {...props}
    >
      <div
        className="h-full bg-[var(--accent)] transition-all duration-1000 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute top-0 right-0 h-full w-[8px] bg-white opacity-40 blur-[2px] rounded-full animate-[pulse_1s_ease-out_infinite]" />
      </div>
    </div>
  );
}

// --- Spinner ---
export type SpinnerProps = React.SVGAttributes<SVGSVGElement>;

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-5 h-5 animate-[spin_1s_linear_infinite]", className)}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--border-primary)"
        strokeWidth="2"
      />
      <path
        d="M22 12C22 6.47715 17.5228 2 12 2"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// --- Stepper ---
export interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center relative gap-2 shrink-0">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-300",
                  isCompleted ? "bg-[var(--accent)]" : "",
                  isActive ? "bg-[var(--accent)] ring-4 ring-offset-0 ring-[var(--accent-pill)] animate-[pulse_1.2s_ease-in-out_infinite]" : "",
                  isPending ? "bg-border-primary" : ""
                )}
              />
              <span className={cn(
                "absolute top-4 text-[11px] uppercase tracking-wider font-medium whitespace-nowrap",
                isCompleted || isActive ? "text-text-primary" : "text-text-placeholder"
              )}>
                {step}
              </span>
            </div>
            
            {!isLast && (
              <div 
                className={cn(
                  "h-[2px] w-12 mx-2 transition-colors duration-300",
                  isCompleted ? "bg-[var(--accent)]" : "bg-border-primary"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
