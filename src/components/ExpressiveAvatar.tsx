import { useEffect, useState } from "react";

type AvatarMood = "idle" | "listening" | "thinking" | "typing" | "sleeping" | "error";

interface ExpressiveAvatarProps {
  mood: AvatarMood;
  size?: number;
}

const MOOD_CONFIG: Record<AvatarMood, { eyes: string; mouth: string }> = {
  idle: { eyes: "eyes-neutral", mouth: "mouth-neutral" },
  listening: { eyes: "eyes-listening", mouth: "mouth-smile" },
  thinking: { eyes: "eyes-thinking", mouth: "mouth-thinking" },
  typing: { eyes: "eyes-down", mouth: "mouth-neutral" },
  sleeping: { eyes: "eyes-sleep", mouth: "mouth-sleep" },
  error: { eyes: "eyes-confused", mouth: "mouth-flat" },
};

export function ExpressiveAvatar({ mood, size = 64 }: ExpressiveAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeSymbol, setEyeSymbol] = useState(MOOD_CONFIG[mood].eyes);

  // Blink animation (only for idle and typing states)
  useEffect(() => {
    if (mood === "sleeping" || mood === "error") return;

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

  // Update eye symbol based on mood and blink state
  useEffect(() => {
    if (isBlinking && mood !== "sleeping") {
      setEyeSymbol("eyes-blink");
    } else {
      setEyeSymbol(MOOD_CONFIG[mood].eyes);
    }
  }, [isBlinking, mood]);

  const mouthSymbol = MOOD_CONFIG[mood].mouth;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Base TV Grid Head */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-300"
      >
        {/* Background */}
        <rect width="120" height="120" rx="24" fill="white" />

        {/* Border */}
        <rect x="2" y="2" width="116" height="116" rx="22" stroke="#305E8C" strokeWidth="4" fill="none" />

        {/* Internal grid */}
        <g opacity="0.6">
          <line x1="40" y1="20" x2="40" y2="100" stroke="#E7EBF0" strokeWidth="2" />
          <line x1="60" y1="20" x2="60" y2="100" stroke="#E7EBF0" strokeWidth="2" />
          <line x1="80" y1="20" x2="80" y2="100" stroke="#E7EBF0" strokeWidth="2" />
          <line x1="20" y1="40" x2="100" y2="40" stroke="#E7EBF0" strokeWidth="2" />
          <line x1="20" y1="60" x2="100" y2="60" stroke="#E7EBF0" strokeWidth="2" />
          <line x1="20" y1="80" x2="100" y2="80" stroke="#E7EBF0" strokeWidth="2" />
        </g>

        {/* Antenna */}
        <path d="M60 8 Q65 15, 68 20" stroke="#305E8C" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="68" cy="20" r="4" fill="#305E8C" />

        {/* Eyes overlay */}
        <svg x="10" y="10" width="100" height="100" viewBox="0 0 100 100">
          <use href={`#${eyeSymbol}`} className="text-[#305E8C] transition-all duration-150" />
        </svg>

        {/* Mouth overlay */}
        <svg x="10" y="10" width="100" height="100" viewBox="0 0 100 100">
          <use href={`#${mouthSymbol}`} className="text-[#305E8C] transition-all duration-300" />
        </svg>
      </svg>
    </div>
  );
}
