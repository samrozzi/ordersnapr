import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
    const cursorPositionRef = React.useRef<{ start: number; end: number } | null>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => internalRef.current!);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Store cursor position before change
      cursorPositionRef.current = {
        start: e.target.selectionStart || 0,
        end: e.target.selectionEnd || 0,
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
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={internalRef}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
