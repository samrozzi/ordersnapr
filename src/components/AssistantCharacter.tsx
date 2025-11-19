import { cn } from '@/lib/utils';

interface AssistantCharacterProps {
  state: 'idle' | 'listening' | 'processing' | 'typing' | 'success' | 'error' | 'speaking';
  isAnimating?: boolean;
}

export function AssistantCharacter({ state, isAnimating = true }: AssistantCharacterProps) {
  // Define face expressions for each state
  const getFaceExpression = () => {
    switch (state) {
      case 'idle':
        return {
          eyes: '^^',
          mouth: '◡',
          eyebrows: '',
          animation: 'animate-bounce-slow',
        };
      case 'listening':
        return {
          eyes: '⚬⚬',
          mouth: 'o',
          eyebrows: '⌃ ⌃',
          animation: 'animate-pulse',
        };
      case 'processing':
        return {
          eyes: '– –',
          mouth: '~',
          eyebrows: '',
          animation: 'animate-pulse',
        };
      case 'typing':
        return {
          eyes: '◉◉',
          mouth: '◡',
          eyebrows: '',
          animation: '',
        };
      case 'success':
        return {
          eyes: '✧✧',
          mouth: '◠',
          eyebrows: '⌃ ⌃',
          animation: 'animate-bounce',
        };
      case 'error':
        return {
          eyes: '╥╥',
          mouth: '︵',
          eyebrows: '⌄ ⌄',
          animation: 'animate-shake',
        };
      case 'speaking':
        return {
          eyes: '^^',
          mouth: 'O',
          eyebrows: '',
          animation: 'animate-pulse',
        };
      default:
        return {
          eyes: '^^',
          mouth: '◡',
          eyebrows: '',
          animation: '',
        };
    }
  };

  const expression = getFaceExpression();

  return (
    <div className={cn(
      'relative w-32 h-40 mx-auto transition-all duration-300',
      isAnimating && expression.animation
    )}>
      {/* TV Body */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl border-4 border-primary/30 shadow-lg">
        {/* Screen */}
        <div className="absolute inset-3 bg-gradient-to-br from-background to-muted rounded-lg border-2 border-primary/20 overflow-hidden">
          {/* Glow effect */}
          {state === 'processing' && (
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          )}
          {state === 'success' && (
            <div className="absolute inset-0 bg-green-500/10 animate-ping" />
          )}
          
          {/* Face */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Eyebrows */}
            {expression.eyebrows && (
              <div className="text-2xl text-primary/60 mb-1 font-bold">
                {expression.eyebrows}
              </div>
            )}
            
            {/* Eyes */}
            <div className={cn(
              'text-3xl text-primary font-bold mb-2 transition-all duration-300',
              state === 'typing' && 'animate-blink'
            )}>
              {expression.eyes}
            </div>
            
            {/* Mouth */}
            <div className={cn(
              'text-2xl text-primary font-bold transition-all duration-300',
              state === 'speaking' && 'animate-pulse'
            )}>
              {expression.mouth}
            </div>
          </div>

          {/* Waveform overlay for listening state */}
          {state === 'listening' && (
            <div className="absolute bottom-2 left-2 right-2 flex items-end justify-center gap-1 h-8">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary/40 rounded-full animate-waveform"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: '20%',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Antenna */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-1 h-6 bg-primary/40 rounded-full">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/60 rounded-full animate-pulse" />
        </div>

        {/* Side buttons */}
        <div className="absolute right-0 top-8 w-2 h-4 bg-primary/30 rounded-l-sm" />
        <div className="absolute right-0 top-14 w-2 h-4 bg-primary/30 rounded-l-sm" />
      </div>

      {/* Success sparkles */}
      {state === 'success' && (
        <>
          <div className="absolute -top-2 -right-2 text-xl animate-ping">✨</div>
          <div className="absolute -bottom-2 -left-2 text-xl animate-ping" style={{ animationDelay: '0.2s' }}>✨</div>
        </>
      )}
    </div>
  );
}
