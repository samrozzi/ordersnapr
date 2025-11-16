import { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isRecording: boolean;
  color?: string;
}

export function VoiceWaveform({ isRecording, color = '#a855f7' }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 40;
    const barWidth = 3;
    const gap = 2;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerY = canvas.height / 2;

      for (let i = 0; i < bars; i++) {
        // Create wave effect with different frequencies
        const frequency = isRecording ? 0.05 : 0.02;
        const amplitude = isRecording ? 40 : 10;
        const offset = i * 0.5;

        // Multiple sine waves for more organic feel
        const wave1 = Math.sin(frame * frequency + offset) * amplitude;
        const wave2 = Math.sin(frame * frequency * 1.5 + offset * 1.2) * (amplitude * 0.6);
        const wave3 = Math.sin(frame * frequency * 0.7 + offset * 0.8) * (amplitude * 0.4);

        const height = Math.abs(wave1 + wave2 + wave3);

        // Gradient for each bar
        const gradient = ctx.createLinearGradient(0, centerY - height, 0, centerY + height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color + '80'); // More transparent in middle
        gradient.addColorStop(1, color);

        ctx.fillStyle = gradient;

        const x = i * (barWidth + gap);

        // Draw top half
        ctx.fillRect(x, centerY - height, barWidth, height);
        // Draw bottom half (mirrored)
        ctx.fillRect(x, centerY, barWidth, height);
      }

      frame++;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={120}
      className="w-full max-w-sm mx-auto"
    />
  );
}
