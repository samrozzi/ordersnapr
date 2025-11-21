import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Toast deduplication utility
const recentToasts = new Set<string>();

export function showToast(
  type: 'success' | 'error' | 'info' | 'warning',
  message: string,
  description?: string
) {
  const toastKey = `${type}-${message}`;
  
  // Prevent duplicate toasts within 2 seconds
  if (recentToasts.has(toastKey)) {
    return;
  }
  
  recentToasts.add(toastKey);
  
  toast[type](message, { description });
  
  setTimeout(() => {
    recentToasts.delete(toastKey);
  }, 2000);
}
