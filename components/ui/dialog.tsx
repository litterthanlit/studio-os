'use client';

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              onClick={() => onOpenChange(false)}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DialogContext.Provider>,
    document.body
  );
}

type DialogContentProps = React.HTMLAttributes<HTMLDivElement>;

export function DialogContent({ className, ...props }: DialogContentProps) {
  const ctx = React.useContext(DialogContext);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "w-full max-w-[640px] border border-card-border bg-card-bg px-4 py-3 md:px-6 md:py-4 rounded-md",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <button
        type="button"
        className="sr-only"
        onClick={() => ctx?.setOpen(false)}
      >
        Close
      </button>
      {props.children}
    </div>
  );
}

type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div className={cn("mb-2 space-y-1", className)} {...props}>
      {props.children}
    </div>
  );
}

type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <h2
      className={cn("text-sm font-semibold text-text-primary", className)}
      {...props}
    />
  );
}

type DialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function DialogDescription({
  className,
  ...props
}: DialogDescriptionProps) {
  return (
    <p
      className={cn("text-xs text-gray-400 leading-relaxed", className)}
      {...props}
    />
  );
}
