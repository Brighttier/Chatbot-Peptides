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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Combine refs
  React.useImperativeHandle(ref, () => textareaRef.current!);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset to single row to get accurate scrollHeight
    textarea.style.height = "auto";

    // Set new height capped at maxHeight
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [maxHeight]);

  // Adjust on value change
  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e);
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(adjustHeight);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      rows={1}
      className={cn(
        "w-full box-border resize-none overflow-y-auto whitespace-pre-wrap break-words",
        "placeholder:text-muted-foreground border-input bg-transparent border",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "min-h-[36px] rounded-2xl outline-none px-3 py-2",
        "text-base md:text-sm",
        className
      )}
      style={{
        maxHeight: `${maxHeight}px`,
      }}
      {...props}
    />
  );
});

AutoExpandingTextarea.displayName = "AutoExpandingTextarea";

export { AutoExpandingTextarea };
