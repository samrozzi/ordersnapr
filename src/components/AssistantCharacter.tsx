import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface AssistantCharacterProps {
  state: 'idle' | 'listening' | 'processing' | 'typing' | 'success' | 'error' | 'speaking' | 'paused';
  className?: string;
}

export function AssistantCharacter({ state, className }: AssistantCharacterProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Subtle blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  const getEyeState = () => {
    if (isBlinking && state !== 'paused') return 'closed';
    if (state === 'paused' || state === 'idle') return 'sleeping';
    if (state === 'listening') return 'attentive';
    if (state === 'processing') return 'thinking';
    if (state === 'error') return 'error';
    return 'open';
  };

  const eyeState = getEyeState();

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {/* Doodle-style character container */}
      <div className="relative w-16 h-16 transition-all duration-500 ease-out">
        {/* Main body - soft blob shape */}
        <div className="relative w-full h-full">
          {/* Soft gradient background */}
          <div className={cn(
            "absolute inset-0 rounded-[2rem] transition-all duration-700",
            "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
            state === 'listening' && "from-primary/20 via-primary/10 to-primary/5 animate-pulse",
            state === 'processing' && "from-primary/15 via-primary/8 to-transparent"
          )} />
          
          {/* Eyes */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-2 transition-all duration-300">
              {eyeState === 'open' && (
                <>
                  <div className="w-2 h-2 bg-foreground rounded-full transition-all duration-200" />
                  <div className="w-2 h-2 bg-foreground rounded-full transition-all duration-200" />
                </>
              )}
              {eyeState === 'closed' && (
                <>
                  <div className="w-2 h-0.5 bg-foreground rounded-full transition-all duration-150" />
                  <div className="w-2 h-0.5 bg-foreground rounded-full transition-all duration-150" />
                </>
              )}
              {eyeState === 'sleeping' && (
                <>
                  <svg width="8" height="4" viewBox="0 0 8 4" className="text-foreground/60">
                    <path d="M 1 3 Q 4 0 7 3" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
                  </svg>
                  <svg width="8" height="4" viewBox="0 0 8 4" className="text-foreground/60">
                    <path d="M 1 3 Q 4 0 7 3" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
                  </svg>
                </>
              )}
              {eyeState === 'attentive' && (
                <>
                  <div className="w-2.5 h-2.5 bg-foreground rounded-full transition-all duration-200" />
                  <div className="w-2.5 h-2.5 bg-foreground rounded-full transition-all duration-200" />
                </>
              )}
              {eyeState === 'thinking' && (
                <>
                  <div className="w-1.5 h-1.5 bg-foreground/70 rounded-full transition-all duration-200" />
                  <div className="w-1.5 h-1.5 bg-foreground/70 rounded-full transition-all duration-200" />
                </>
              )}
              {eyeState === 'error' && (
                <>
                  <div className="text-destructive text-xs font-bold">×</div>
                  <div className="text-destructive text-xs font-bold">×</div>
                </>
              )}
            </div>
          </div>

          {/* Mouth - subtle smile */}
          <div className="absolute inset-0 flex items-center justify-center pt-4">
            {state !== 'error' && (
              <svg width="12" height="6" viewBox="0 0 12 6" className="text-foreground/40 transition-all duration-300">
                <path 
                  d={state === 'listening' ? "M 2 2 Q 6 5 10 2" : "M 2 3 Q 6 5 10 3"} 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  fill="none" 
                  strokeLinecap="round" 
                />
              </svg>
            )}
          </div>

          {/* Sleep bubble animation */}
          {(state === 'paused' || state === 'idle') && (
            <div className="absolute -right-1 -top-1">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-background/90 border border-foreground/20 animate-[bounce_2s_ease-in-out_infinite] flex items-center justify-center">
                  <span className="text-[6px] text-foreground/30">z</span>
                </div>
                <div className="absolute -top-2 -right-1 w-2 h-2 rounded-full bg-background/80 border border-foreground/15 animate-[bounce_2s_ease-in-out_infinite_0.3s] flex items-center justify-center">
                  <span className="text-[4px] text-foreground/20">z</span>
                </div>
              </div>
            </div>
          )}

          {/* Listening pulse effect */}
          {state === 'listening' && (
            <div className="absolute inset-0 rounded-[2rem] border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
          )}

          {/* Success sparkles */}
          {state === 'success' && (
            <>
              <div className="absolute -top-1 -left-1 text-yellow-500 text-xs animate-bounce">✨</div>
              <div className="absolute -top-1 -right-1 text-yellow-500 text-xs animate-bounce delay-100">✨</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
