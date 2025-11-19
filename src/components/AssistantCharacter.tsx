import { cn } from '@/lib/utils';

interface AssistantCharacterProps {
  state: 'idle' | 'listening' | 'processing' | 'typing' | 'success' | 'error' | 'speaking' | 'paused';
  isAnimating?: boolean;
  className?: string;
}

// Helper to get face expression based on state
function getFaceExpression(state: AssistantCharacterProps['state']) {
  switch (state) {
    case 'idle':
      return {
        eyes: 'closed-happy',
        mouth: 'smile',
        animation: 'animate-[bounce_3s_ease-in-out_infinite]',
      };
    case 'listening':
      return {
        eyes: 'wide',
        mouth: 'o',
        animation: 'animate-pulse',
      };
    case 'paused':
      return {
        eyes: 'closed-happy',
        mouth: 'line',
        animation: 'animate-[bounce_3s_ease-in-out_infinite]',
      };
    case 'processing':
      return {
        eyes: 'thinking',
        mouth: 'line',
        animation: 'animate-pulse',
      };
    case 'success':
      return {
        eyes: 'happy',
        mouth: 'big-smile',
        animation: 'animate-bounce',
      };
    case 'error':
      return {
        eyes: 'x',
        mouth: 'line',
        animation: '',
      };
    default:
      return {
        eyes: 'open',
        mouth: 'smile',
        animation: '',
      };
  }
}

export function AssistantCharacter({ state, isAnimating = false, className }: AssistantCharacterProps) {
  const face = getFaceExpression(state);

  return (
    <div className="flex items-center justify-center mb-4">
      {/* TV-Inspired Character Container */}
      <div className={cn(
        "relative transition-all duration-300",
        isAnimating && face.animation,
        className
      )}>
        {/* Antenna */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-4">
          <div className="w-0.5 h-6 bg-gradient-to-t from-primary to-primary/40 rounded-full transform -rotate-12 origin-bottom" />
          <div className="w-0.5 h-6 bg-gradient-to-t from-primary to-primary/40 rounded-full transform rotate-12 origin-bottom" />
        </div>

        {/* TV Body - Organic rounded rectangle */}
        <div className="relative w-32 h-28 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-[2rem] shadow-xl border-2 border-primary/30 p-3">
          {/* Screen Area - More organic oval shape */}
          <div className="relative w-full h-full bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm rounded-[1.5rem] overflow-hidden border border-primary/20 shadow-inner flex flex-col items-center justify-center">
            
            {/* Eyes */}
            <div className={cn(
              "flex gap-3 mb-2 transition-all duration-300"
            )}>
              {face.eyes === 'open' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" className="text-foreground">
                    <ellipse cx="7" cy="7" rx="5" ry="6" fill="currentColor" />
                  </svg>
                  <svg width="14" height="14" viewBox="0 0 14 14" className="text-foreground">
                    <ellipse cx="7" cy="7" rx="5" ry="6" fill="currentColor" />
                  </svg>
                </>
              )}
              {face.eyes === 'happy' && (
                <>
                  <svg width="14" height="8" viewBox="0 0 14 8" className="text-foreground">
                    <path d="M 2 6 Q 7 0 12 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                  <svg width="14" height="8" viewBox="0 0 14 8" className="text-foreground">
                    <path d="M 2 6 Q 7 0 12 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                </>
              )}
              {face.eyes === 'wide' && (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" className="text-foreground">
                    <ellipse cx="8" cy="8" rx="6" ry="7" fill="currentColor" />
                  </svg>
                  <svg width="16" height="16" viewBox="0 0 16 16" className="text-foreground">
                    <ellipse cx="8" cy="8" rx="6" ry="7" fill="currentColor" />
                  </svg>
                </>
              )}
              {face.eyes === 'closed-happy' && (
                <>
                  <svg width="14" height="4" viewBox="0 0 14 4" className="text-foreground">
                    <path d="M 2 2 Q 7 0 12 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                  <svg width="14" height="4" viewBox="0 0 14 4" className="text-foreground">
                    <path d="M 2 2 Q 7 0 12 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                </>
              )}
              {face.eyes === 'thinking' && (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" className="text-foreground">
                    <ellipse cx="6" cy="6" rx="4" ry="5" fill="currentColor" />
                  </svg>
                  <svg width="12" height="12" viewBox="0 0 12 12" className="text-foreground">
                    <ellipse cx="6" cy="6" rx="4" ry="5" fill="currentColor" />
                  </svg>
                </>
              )}
              {face.eyes === 'x' && (
                <>
                  <div className="text-destructive font-bold text-lg">×</div>
                  <div className="text-destructive font-bold text-lg">×</div>
                </>
              )}
            </div>

            {/* Mouth */}
            <div className="relative">
              {face.mouth === 'smile' && (
                <svg width="24" height="12" viewBox="0 0 24 12" className="text-foreground">
                  <path d="M 3 2 Q 12 10 21 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
              {face.mouth === 'speaking' && (
                <svg width="20" height="10" viewBox="0 0 20 10" className="text-foreground animate-pulse">
                  <ellipse cx="10" cy="5" rx="8" ry="4" fill="currentColor" />
                </svg>
              )}
              {face.mouth === 'o' && (
                <svg width="14" height="18" viewBox="0 0 14 18" className="text-foreground">
                  <ellipse cx="7" cy="9" rx="5" ry="7" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              )}
              {face.mouth === 'line' && (
                <svg width="20" height="2" viewBox="0 0 20 2" className="text-foreground">
                  <path d="M 2 1 L 18 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              {face.mouth === 'big-smile' && (
                <svg width="32" height="16" viewBox="0 0 32 16" className="text-foreground">
                  <path d="M 3 3 Q 16 14 29 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </div>

            {/* Special Effects */}
            {state === 'listening' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-1 bg-primary/30 rounded-full animate-pulse" />
              </div>
            )}
            
            {state === 'success' && (
              <>
                <div className="absolute top-2 left-2 text-yellow-500 text-lg animate-bounce">✨</div>
                <div className="absolute top-2 right-2 text-yellow-500 text-lg animate-bounce delay-100">✨</div>
              </>
            )}

            {(state === 'idle' || state === 'paused') && (
              <div className="absolute bottom-2 right-3 text-muted-foreground/40 text-xs animate-pulse">
                Zzz
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
