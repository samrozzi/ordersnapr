import { cn } from '@/lib/utils';

interface AssistantCharacterProps {
  state: 'idle' | 'listening' | 'processing' | 'typing' | 'success' | 'error' | 'speaking' | 'paused';
  isAnimating?: boolean;
}

// Helper to get face expression based on state
function getFaceExpression(state: AssistantCharacterProps['state']) {
  switch (state) {
    case 'idle':
      return {
        eyes: 'closed',
        mouth: 'line',
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
        eyes: 'closed',
        mouth: 'line',
        animation: 'animate-[bounce_3s_ease-in-out_infinite]',
      };
    case 'processing':
      return {
        eyes: 'open',
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

export function AssistantCharacter({ state, isAnimating = false }: AssistantCharacterProps) {
  const face = getFaceExpression(state);

  return (
    <div className="flex items-center justify-center mb-4">
      {/* Compact Cute Container */}
      <div className={cn(
        "relative w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl shadow-xl p-3 border-2 border-primary/30",
        isAnimating && face.animation
      )}>
        {/* Character Face Screen */}
        <div className="relative w-full h-full bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-primary/20 shadow-inner flex flex-col items-center justify-center">
          
          {/* Eyes */}
          <div className={cn(
            "flex gap-3 mb-2 transition-all duration-300"
          )}>
            {face.eyes === 'open' && (
              <>
                <div className="w-3 h-3 bg-foreground rounded-full" />
                <div className="w-3 h-3 bg-foreground rounded-full" />
              </>
            )}
            {face.eyes === 'happy' && (
              <>
                <div className="w-3 h-1 bg-foreground rounded-full transform rotate-12" />
                <div className="w-3 h-1 bg-foreground rounded-full transform -rotate-12" />
              </>
            )}
            {face.eyes === 'wide' && (
              <>
                <div className="w-4 h-4 bg-foreground rounded-full" />
                <div className="w-4 h-4 bg-foreground rounded-full" />
              </>
            )}
            {face.eyes === 'closed' && (
              <>
                <div className="w-3 h-0.5 bg-foreground rounded-full" />
                <div className="w-3 h-0.5 bg-foreground rounded-full" />
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
              <div className="w-6 h-3 border-b-2 border-foreground rounded-b-full" />
            )}
            {face.mouth === 'speaking' && (
              <div className="w-5 h-2 bg-foreground rounded-full animate-pulse" />
            )}
            {face.mouth === 'o' && (
              <div className="w-3 h-4 border-2 border-foreground rounded-full" />
            )}
            {face.mouth === 'line' && (
              <div className="w-5 h-0.5 bg-foreground rounded-full" />
            )}
            {face.mouth === 'big-smile' && (
              <div className="w-8 h-4 border-b-2 border-foreground rounded-b-full" />
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
            <div className="absolute bottom-4 right-4 text-muted-foreground/40 text-xs animate-pulse">
              Zzz
            </div>
          )}
        </div>

        {/* Cute bottom indicator dots */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
        </div>
      </div>
    </div>
  );
}
