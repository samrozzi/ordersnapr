import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, onChange, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = React.useRef<{ start: number; end: number } | null>(null);

  // Merge refs
  React.useImperativeHandle(ref, () => internalRef.current!);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Store cursor position before change
    cursorPositionRef.current = {
      start: e.target.selectionStart,
      end: e.target.selectionEnd,
    };
    onChange?.(e);
  };

  React.useEffect(() => {
    // Restore cursor position after React updates
    if (cursorPositionRef.current && internalRef.current) {
      const { start, end } = cursorPositionRef.current;
      internalRef.current.setSelectionRange(start, end);
      cursorPositionRef.current = null;
    }
  });

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={internalRef}
      onChange={handleChange}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
