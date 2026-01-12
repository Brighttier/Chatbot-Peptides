"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AutoExpandingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

const AutoExpandingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoExpandingTextareaProps
>(({ className, maxHeight = 150, onChange, value, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(value || "");

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
    onChange?.(e);
  };

  // Shared styles for both hidden div and textarea - must match exactly for sizing
  const sharedStyles = cn(
    "px-3 py-2 text-base md:text-sm border rounded-2xl",
    className
  );

  return (
    <div
      className="grid flex-1 min-w-0"
      style={{ maxHeight: `${maxHeight}px`, overflow: "auto" }}
    >
      {/* Hidden div - mirrors textarea content to determine height */}
      <div
        className={cn(
          sharedStyles,
          "invisible whitespace-pre-wrap break-words",
          "[grid-area:1/1/2/2]"
        )}
        aria-hidden="true"
      >
        {internalValue + " "}
      </div>
      {/* Actual textarea - overlays hidden div */}
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        rows={1}
        className={cn(
          sharedStyles,
          "placeholder:text-muted-foreground bg-transparent outline-none resize-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "[grid-area:1/1/2/2]"
        )}
        {...props}
      />
    </div>
  );
});

AutoExpandingTextarea.displayName = "AutoExpandingTextarea";

export { AutoExpandingTextarea };
