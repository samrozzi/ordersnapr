import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AvatarMood = "neutral" | "listening" | "thinking" | "sleeping";

interface SimpleAvatarProps {
  mood: AvatarMood;
  size?: number;
}

export function SimpleAvatar({ mood, size = 96 }: SimpleAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Blink animation: 6-10 seconds interval
  useEffect(() => {
    if (mood === "sleeping") return;

    const scheduleNextBlink = () => {
      const delay = Math.random() * 4000 + 6000; // 6-10 seconds
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
        }, 150);
      }, delay);
    };

    const timeoutId = scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, [mood, isBlinking]);

  const displayMood = isBlinking ? "blink" : mood;

  return (
    <div
      className={cn(
        "ai-avatar animate-float",
        `ai-avatar--${displayMood}`
      )}
      style={{ width: size, height: size }}
    />
  );
}
