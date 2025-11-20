import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  isRecording: boolean;
}

export function VoiceWaveform({ isRecording }: VoiceWaveformProps) {
  return (
    <div className="flex items-center gap-1 h-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-0.5 bg-primary rounded-full transition-all duration-300",
            isRecording ? "animate-pulse" : "h-1.5"
          )}
          style={{
            height: isRecording ? `${Math.random() * 12 + 6}px` : '6px',
            animationDelay: `${i * 100}ms`
          }}
        />
      ))}
    </div>
  );
}
