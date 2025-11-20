import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AvatarMood = "idle" | "listening" | "thinking" | "typing" | "sleeping" | "error";

interface ExpressiveAvatarProps {
  mood: AvatarMood;
  size?: number;
}

const MOOD_CONFIG: Record<
  AvatarMood,
  {
    eyeStyle: string;
    mouthStyle: string;
    animation?: string;
  }
> = {
  idle: {
    eyeStyle: "top-[35%] left-[30%] w-[12%] h-[18%]",
    mouthStyle: "top-[58%] left-[40%] w-[20%] h-[4%]",
  },
  listening: {
    eyeStyle: "top-[38%] left-[30%] w-[12%] h-[16%]",
    mouthStyle: "top-[58%] left-[38%] w-[24%] h-[6%]",
    animation: "listening-bob",
  },
  thinking: {
    eyeStyle: "top-[32%] left-[30%] w-[12%] h-[16%]",
    mouthStyle: "top-[60%] left-[42%] w-[18%] h-[3%]",
    animation: "thinking-sway",
  },
  typing: {
    eyeStyle: "top-[40%] left-[30%] w-[12%] h-[14%]",
    mouthStyle: "top-[58%] left-[40%] w-[20%] h-[4%]",
  },
  sleeping: {
    eyeStyle: "top-[42%] left-[30%] w-[12%] h-[2%]",
    mouthStyle: "top-[60%] left-[42%] w-[16%] h-[3%]",
    animation: "breathing",
  },
  error: {
    eyeStyle: "top-[35%] left-[30%] w-[12%] h-[18%]",
    mouthStyle: "top-[60%] left-[40%] w-[20%] h-[3%]",
    animation: "error-shake",
  },
};

export function ExpressiveAvatar({ mood, size = 96 }: ExpressiveAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [showSleepBubble, setShowSleepBubble] = useState(false);

  // Blink animation for non-sleeping states
  useEffect(() => {
    if (mood === "sleeping" || mood === "error") return;

    const scheduleNextBlink = () => {
      const delay = Math.random() * 3000 + 4000; // 4-7 seconds
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

  // Sleep bubble animation
  useEffect(() => {
    if (mood === "sleeping") {
      const bubbleTimer = setTimeout(() => setShowSleepBubble(true), 1000);
      return () => clearTimeout(bubbleTimer);
    } else {
      setShowSleepBubble(false);
    }
  }, [mood]);

  const config = MOOD_CONFIG[mood];

  return (
    <div
      className={cn(
        "relative inline-block",
        config.animation && `animate-${config.animation}`
      )}
      style={{ width: size, height: size }}
    >
      {/* Base TV Grid Head - Static SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        {/* Background */}
        <rect width="120" height="120" rx="24" fill="white" />

        {/* Border */}
        <rect
          x="2"
          y="2"
          width="116"
          height="116"
          rx="22"
          stroke="#305E8C"
          strokeWidth="4"
          fill="none"
        />

        {/* Internal grid */}
        <g opacity="0.3">
          <line x1="40" y1="20" x2="40" y2="100" stroke="#305E8C" strokeWidth="1.5" />
          <line x1="60" y1="20" x2="60" y2="100" stroke="#305E8C" strokeWidth="1.5" />
          <line x1="80" y1="20" x2="80" y2="100" stroke="#305E8C" strokeWidth="1.5" />
          <line x1="20" y1="40" x2="100" y2="40" stroke="#305E8C" strokeWidth="1.5" />
          <line x1="20" y1="60" x2="100" y2="60" stroke="#305E8C" strokeWidth="1.5" />
          <line x1="20" y1="80" x2="100" y2="80" stroke="#305E8C" strokeWidth="1.5" />
        </g>

        {/* Antenna with subtle breathing */}
        <g className={mood === "idle" ? "animate-antenna-breathe" : ""}>
          <path
            d="M60 8 Q65 15, 68 20"
            stroke="#305E8C"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="68" cy="20" r="4" fill="#305E8C" />
        </g>
      </svg>

      {/* Face Overlays - SVG positioned absolutely */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 pointer-events-none"
      >
        {/* Left Eye */}
        <ellipse
          cx="42"
          cy="50"
          rx="6"
          ry={isBlinking && mood !== "sleeping" ? 1 : mood === "sleeping" ? 1 : 9}
          fill="#305E8C"
          className={cn(
            "transition-all duration-150",
            config.animation === "thinking-sway" && "animate-eye-sway"
          )}
        />

        {/* Right Eye */}
        <ellipse
          cx="78"
          cy="50"
          rx="6"
          ry={isBlinking && mood !== "sleeping" ? 1 : mood === "sleeping" ? 1 : 9}
          fill="#305E8C"
          className={cn(
            "transition-all duration-150",
            config.animation === "thinking-sway" && "animate-eye-sway"
          )}
        />

        {/* Eyebrows for error state */}
        {mood === "error" && (
          <g stroke="#305E8C" strokeWidth="2.5" strokeLinecap="round">
            <path d="M35 42 L45 40" />
            <path d="M75 40 L85 42" />
          </g>
        )}

        {/* Mouth */}
        <path
          d={
            mood === "idle"
              ? "M48 70 L72 70"
              : mood === "listening"
              ? "M46 70 Q60 76 74 70"
              : mood === "thinking"
              ? "M50 72 Q60 69 68 72"
              : mood === "typing"
              ? "M48 70 L72 70"
              : mood === "sleeping"
              ? "M52 72 Q60 74 68 72"
              : "M48 72 Q60 69 72 72"
          }
          stroke="#305E8C"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300"
        />
      </svg>

      {/* Sleep bubble */}
      {showSleepBubble && mood === "sleeping" && (
        <div className="absolute -top-2 -right-2 animate-fade-in">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <text x="8" y="16" fontSize="16" fill="#305E8C" opacity="0.6">
              Z
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}
