'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          ref={ref} 
          {...props} 
        />
        <div className={cn(
          "w-9 h-5 rounded-full peer-focus:outline-none",
          "bg-border-primary peer-checked:bg-[var(--accent)]",
          "peer-focus:ring-2 peer-focus:ring-[var(--accent-pill)] peer-focus:ring-offset-1 peer-focus:ring-offset-bg-primary",
          "transition-colors duration-200 ease-out",
          "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white",
          "after:shadow-sm after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-200",
          "peer-checked:after:translate-x-[16px]",
          className
        )}></div>
      </label>
    );
  }
);
Switch.displayName = "Switch";
