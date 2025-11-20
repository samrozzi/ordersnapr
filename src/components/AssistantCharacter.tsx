import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface AssistantCharacterProps {
  state: 'idle' | 'listening' | 'processing' | 'typing' | 'success' | 'error' | 'speaking' | 'paused';
  className?: string;
}

export function AssistantCharacter({ state, className }: AssistantCharacterProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);
  const [eyePosition, setEyePosition] = useState(0);
  const [nodAngle, setNodAngle] = useState(0);
  const [isLargeHeadTurn, setIsLargeHeadTurn] = useState(false);
  const [mouthOpenness, setMouthOpenness] = useState(0);

  // Subtle blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Enhanced listening animations with nodding, head turns, and mouth movement
  useEffect(() => {
    if (state === 'listening') {
      let nodProgress = 0;
      let tiltProgress = 0;
      let mouthProgress = 0;
      
      // Smooth continuous nodding with sine wave
      const nodInterval = setInterval(() => {
        nodProgress += 0.1;
        const smoothNod = Math.sin(nodProgress) * 8; // -8 to +8 degrees, fluid
        setNodAngle(smoothNod);
      }, 50);

      // Fluid head turn with smooth easing
      const turnInterval = setInterval(() => {
        tiltProgress += 0.05;
        const isLarge = Math.random() > 0.7;
        const targetTilt = Math.sin(tiltProgress) * (isLarge ? 18 : 5); // Smooth wave
        setHeadTilt(targetTilt);
        setIsLargeHeadTurn(isLarge);
      }, 80);

      // Breathing mouth motion - smooth wave
      const mouthInterval = setInterval(() => {
        mouthProgress += 0.08;
        const smoothMouth = (Math.sin(mouthProgress) + 1) * 0.5; // 0 to 1, smooth
        setMouthOpenness(smoothMouth);
      }, 60);

      return () => {
        clearInterval(nodInterval);
        clearInterval(turnInterval);
        clearInterval(mouthInterval);
      };
    } else {
      setNodAngle(0);
      setHeadTilt(0);
      setIsLargeHeadTurn(false);
      setMouthOpenness(0);
    }
  }, [state]);

  // Eye and mouth tracking when typing (reading text together)
  useEffect(() => {
    if (state === 'typing') {
      const trackingInterval = setInterval(() => {
        setEyePosition(prev => {
          const next = prev + 1;
          return next > 4 ? -2 : next;
        });
      }, 400);
      return () => clearInterval(trackingInterval);
    } else {
      setEyePosition(0);
    }
  }, [state]);

  const getEyeState = () => {
    if (isBlinking && state !== 'paused') return 'closed';
    if (state === 'paused' || state === 'idle') return 'sleeping';
    if (state === 'listening') return 'attentive';
    if (state === 'typing') return 'reading';
    if (state === 'processing') return 'thinking';
    if (state === 'error') return 'error';
    return 'open';
  };

  const eyeState = getEyeState();

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {/* Character container with 3D transforms */}
      <div 
        className={cn(
          "relative w-16 h-16 transition-all duration-500 ease-out",
          // Remove bouncing for paused/idle - should be completely still (sleeping)
        )}
        style={{ 
          transform: state === 'listening' 
            ? `perspective(200px) rotateX(${nodAngle}deg) rotateY(${headTilt * 2}deg) rotateZ(${headTilt}deg)` 
            : state === 'paused' || state === 'idle'
            ? 'none' // Completely still when sleeping
            : `rotate(${headTilt}deg)`,
        }}
      >
        {/* Main body - soft organic blob */}
        <div className="relative w-full h-full">
          {/* Soft gradient glow */}
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-700 blur-md",
            "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent",
            state === 'listening' && "from-primary/30 via-primary/20 to-primary/10 animate-pulse"
          )} />
          
          {/* Main face circle */}
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            "bg-gradient-to-br from-background to-muted border-2 border-primary/20 shadow-lg"
          )} />
          
          {/* Eyes container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="flex gap-2.5 transition-all duration-300"
              style={{
                transform: state === 'typing' ? `translateY(2px) translateX(${eyePosition}px)` : 'none'
              }}
            >
              {/* Eyes - hand-drawn style */}
              {eyeState === 'open' && (
                <>
                  <svg width="10" height="12" viewBox="0 0 10 12" className="text-foreground">
                    <path 
                      d="M 2 6 Q 2 2, 5 2 T 8 6 T 5 10 T 2 6" 
                      fill="currentColor"
                      className="transition-all duration-200"
                    />
                  </svg>
                  <svg width="10" height="12" viewBox="0 0 10 12" className="text-foreground">
                    <path 
                      d="M 2 6 Q 2 2, 5 2 T 8 6 T 5 10 T 2 6" 
                      fill="currentColor"
                      className="transition-all duration-200"
                    />
                  </svg>
                </>
              )}
              {eyeState === 'closed' && (
                <>
                  <svg width="10" height="3" viewBox="0 0 10 3" className="text-foreground">
                    <path 
                      d="M 1 1.5 Q 5 0, 9 1.5" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg width="10" height="3" viewBox="0 0 10 3" className="text-foreground">
                    <path 
                      d="M 1 1.5 Q 5 0, 9 1.5" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                  </svg>
                </>
              )}
              {eyeState === 'sleeping' && (
                <>
                  <svg width="10" height="4" viewBox="0 0 10 4" className="text-foreground/60">
                    <path 
                      d="M 1 3 Q 5 0.5, 9 3" 
                      stroke="currentColor" 
                      strokeWidth="1.2" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg width="10" height="4" viewBox="0 0 10 4" className="text-foreground/60">
                    <path 
                      d="M 1 3 Q 5 0.5, 9 3" 
                      stroke="currentColor" 
                      strokeWidth="1.2" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                  </svg>
                </>
              )}
              {eyeState === 'attentive' && (
                <>
                  <svg width="12" height="14" viewBox="0 0 12 14" className="text-foreground">
                    <path 
                      d="M 2 7 Q 2 2, 6 2 T 10 7 T 6 12 T 2 7" 
                      fill="currentColor"
                      className="transition-all duration-200"
                    />
                  </svg>
                  <svg width="12" height="14" viewBox="0 0 12 14" className="text-foreground">
                    <path 
                      d="M 2 7 Q 2 2, 6 2 T 10 7 T 6 12 T 2 7" 
                      fill="currentColor"
                      className="transition-all duration-200"
                    />
                  </svg>
                </>
              )}
              {eyeState === 'reading' && (
                <>
                  <svg width="10" height="12" viewBox="0 0 10 12" className="text-foreground">
                    <path 
                      d="M 2 7 Q 2 3, 5 3 T 8 7 T 5 11 T 2 7" 
                      fill="currentColor"
                    />
                  </svg>
                  <svg width="10" height="12" viewBox="0 0 10 12" className="text-foreground">
                    <path 
                      d="M 2 7 Q 2 3, 5 3 T 8 7 T 5 11 T 2 7" 
                      fill="currentColor"
                    />
                  </svg>
                </>
              )}
              {eyeState === 'thinking' && (
                <>
                  <svg width="9" height="10" viewBox="0 0 9 10" className="text-foreground/70">
                    <path 
                      d="M 2 5 Q 2 2, 4.5 2 T 7 5 T 4.5 8 T 2 5" 
                      fill="currentColor"
                    />
                  </svg>
                  <svg width="9" height="10" viewBox="0 0 9 10" className="text-foreground/70">
                    <path 
                      d="M 2 5 Q 2 2, 4.5 2 T 7 5 T 4.5 8 T 2 5" 
                      fill="currentColor"
                    />
                  </svg>
                </>
              )}
              {eyeState === 'error' && (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-destructive">
                    <path d="M 2 2 L 8 8 M 8 2 L 2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-destructive">
                    <path d="M 2 2 L 8 8 M 8 2 L 2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </>
              )}
            </div>
          </div>

          {/* Mouth - whimsical hand-drawn curves with state-specific expressions */}
          <div className="absolute inset-0 flex items-center justify-center pt-4">
            {state !== 'error' && (
              <svg 
                width="16" 
                height="8" 
                viewBox="0 0 16 8" 
                className="text-foreground/40 transition-all duration-300"
                style={{
                  transform: state === 'typing' 
                    ? `translateX(${eyePosition * 0.5}px) translateY(${Math.sin(eyePosition) * 0.5}px)` 
                    : state === 'listening'
                    ? `translateY(${mouthOpenness}px)`
                    : 'none'
                }}
              >
                <path 
                  d={
                    state === 'typing'
                      ? "M 2 5 Q 8 2, 14 5" // Happy upward smile - cheerful and focused
                      : state === 'listening' 
                      ? `M 2 ${3 + mouthOpenness * 0.8} Q 8 ${5 + mouthOpenness * 1.2}, 14 ${3 + mouthOpenness * 0.8}` // Breathing motion
                      : state === 'success'
                      ? "M 2 2 Q 8 7, 14 2" // Big happy smile
                      : state === 'paused' || state === 'idle'
                      ? "M 2 5 Q 8 5.5, 14 5" // Completely neutral/slightly down for sleeping
                      : "M 2 3 Q 8 6, 14 3" // Gentle neutral smile
                  }
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
            )}
          </div>

          {/* Sleep bubble animation - cute Zzz */}
          {(state === 'paused' || state === 'idle') && (
            <div className="absolute -right-1 -top-1">
              <div className="relative">
                <div className="absolute w-3 h-3 rounded-full bg-background/90 border border-foreground/20 animate-[bounce_2s_ease-in-out_infinite] flex items-center justify-center">
                  <span className="text-[6px] text-foreground/30 font-serif">z</span>
                </div>
                <div className="absolute -top-2 -right-1 w-2 h-2 rounded-full bg-background/80 border border-foreground/15 animate-[bounce_2s_ease-in-out_infinite_0.3s] flex items-center justify-center">
                  <span className="text-[4px] text-foreground/20 font-serif">z</span>
                </div>
              </div>
            </div>
          )}

          {/* Listening pulse effect - subtle */}
          {state === 'listening' && (
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          )}

          {/* Success sparkles */}
          {state === 'success' && (
            <>
              <div className="absolute -top-1 -left-1 text-yellow-500/80 text-xs animate-bounce">✨</div>
              <div className="absolute -top-1 -right-1 text-yellow-500/80 text-xs animate-bounce" style={{ animationDelay: '0.1s' }}>✨</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
