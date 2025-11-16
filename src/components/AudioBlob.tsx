import { useEffect, useRef } from 'react';

interface AudioBlobProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: string;
  size?: number;
}

export function AudioBlob({ analyser, isActive, color = '#a855f7', size = 200 }: AudioBlobProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = size;
    const height = size;
    const centerX = width / 2;
    const centerY = height / 2;

    let dataArray: Uint8Array | null = null;
    if (analyser) {
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Get audio data if available
      let audioLevel = 0;
      if (analyser && dataArray && isActive) {
        analyser.getByteFrequencyData(dataArray);
        // Calculate average amplitude
        const sum = dataArray.reduce((a, b) => a + b, 0);
        audioLevel = sum / dataArray.length / 255; // Normalize to 0-1
      }

      // Animate time for organic movement
      timeRef.current += isActive ? 0.03 : 0.01;

      // Base radius with audio reactivity
      const baseRadius = size * 0.25;
      const audioBoost = audioLevel * 40; // Audio makes blob bigger
      const idleMovement = isActive ? 10 : 5; // Less movement when idle

      // Create blob path with multiple points
      const points = 12;
      const blob: [number, number][] = [];

      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;

        // Multiple sine waves for organic shape
        const noise1 = Math.sin(angle * 3 + timeRef.current) * idleMovement;
        const noise2 = Math.cos(angle * 5 - timeRef.current * 0.7) * (idleMovement * 0.5);
        const noise3 = Math.sin(angle * 2 + timeRef.current * 1.3) * (idleMovement * 0.3);

        // Combine noise with audio reactivity
        const radius = baseRadius + noise1 + noise2 + noise3 + audioBoost;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        blob.push([x, y]);
      }

      // Draw smooth blob using curves
      ctx.beginPath();
      ctx.moveTo(blob[0][0], blob[0][1]);

      for (let i = 0; i < points; i++) {
        const current = blob[i];
        const next = blob[(i + 1) % points];
        const nextNext = blob[(i + 2) % points];

        // Control points for smooth curves
        const cpX = (current[0] + next[0]) / 2;
        const cpY = (current[1] + next[1]) / 2;

        ctx.quadraticCurveTo(next[0], next[1], cpX, cpY);
      }

      ctx.closePath();

      // Create gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 2);

      if (isActive) {
        // Active state: vibrant colors
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(0.5, `${color}AA`);
        gradient.addColorStop(1, `${color}33`);
      } else {
        // Idle state: subtle colors
        gradient.addColorStop(0, `${color}88`);
        gradient.addColorStop(0.5, `${color}44`);
        gradient.addColorStop(1, `${color}11`);
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Add glow effect
      ctx.shadowBlur = isActive ? 40 + audioBoost : 20;
      ctx.shadowColor = color;
      ctx.fill();

      // Add inner highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.3,
        centerY - baseRadius * 0.3,
        0,
        centerX,
        centerY,
        baseRadius
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = highlightGradient;
      ctx.fill();

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isActive, color, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="mx-auto"
    />
  );
}
