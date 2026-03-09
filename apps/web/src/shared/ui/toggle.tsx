"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/shared/utils/cn";

export interface ToggleProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
}

export const Toggle = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  ToggleProps
>(({ className, label, id, ...props }, ref) => {
  const toggleId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex items-center gap-2">
      <SwitchPrimitive.Root
        ref={ref}
        id={toggleId}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--color-brand-500)] data-[state=unchecked]:bg-[var(--border-strong)]",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-[120ms] ease-out data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
      </SwitchPrimitive.Root>
      {label && (
        <label
          htmlFor={toggleId}
          className="text-sm text-[var(--text-primary)] cursor-pointer"
        >
          {label}
        </label>
      )}
    </div>
  );
});

Toggle.displayName = "Toggle";
