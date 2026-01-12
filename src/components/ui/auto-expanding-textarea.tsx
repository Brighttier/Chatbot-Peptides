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

  // Sync with controlled value
  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
    onChange?.(e);
  };

  return (
    <div
      className={cn("grid flex-1", className)}
      style={{ maxHeight: `${maxHeight}px`, overflow: "auto" }}
    >
      {/* Hidden div that expands to fit content */}
      <div
        className={cn(
          "invisible whitespace-pre-wrap break-words",
          "border px-3 py-2 text-base md:text-sm",
          "[grid-area:1/1/2/2]"
        )}
        aria-hidden="true"
      >
        {internalValue + " "}
      </div>
      {/* Actual textarea positioned in same grid cell */}
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        rows={1}
        className={cn(
          "placeholder:text-muted-foreground border-input bg-transparent px-3 py-2 outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "resize-none min-h-[36px] rounded-2xl border",
          "text-base md:text-sm",
          "[grid-area:1/1/2/2]"
        )}
        {...props}
      />
    </div>
  );
});

AutoExpandingTextarea.displayName = "AutoExpandingTextarea";

export { AutoExpandingTextarea };
