import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface SignatureData {
  name: string;
  signed_at: string;
  image_url: string;
}

interface SignatureFieldProps {
  value: SignatureData | null;
  onChange: (value: SignatureData | null) => void;
  readOnly?: boolean;
  required?: boolean;
}

export function SignatureField({
  value,
  onChange,
  readOnly = false,
  required = false,
}: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState(value?.name || '');
  const [hasDrawn, setHasDrawn] = useState(!!value?.image_url);

  useEffect(() => {
    if (value?.image_url && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = value.image_url;
      }
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = 'touches' in e 
      ? e.touches[0].clientX - rect.left 
      : e.clientX - rect.left;
    const y = 'touches' in e 
      ? e.touches[0].clientY - rect.top 
      : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = 'touches' in e 
      ? e.touches[0].clientX - rect.left 
      : e.clientX - rect.left;
    const y = 'touches' in e 
      ? e.touches[0].clientY - rect.top 
      : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasDrawn && name) {
      saveSignature();
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !name) return;

    const imageUrl = canvas.toDataURL('image/png');
    onChange({
      name,
      signed_at: new Date().toISOString(),
      image_url: imageUrl,
    });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      onChange(null);
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (hasDrawn && newName) {
      saveSignature();
    }
  };

  if (readOnly && value) {
    return (
      <Card className="p-4 space-y-4">
        <div>
          <Label>Signed by</Label>
          <p className="text-sm font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(value.signed_at).toLocaleString()}
          </p>
        </div>
        <div className="border rounded-lg p-2 bg-background">
          <img src={value.image_url} alt="Signature" className="max-w-full h-auto" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signature-name">
          Your Name {required && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="signature-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Type your full name"
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label>Signature {required && <span className="text-destructive">*</span>}</Label>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full border-2 border-dashed rounded-lg bg-background touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={!hasDrawn}
          >
            Clear Signature
          </Button>
        )}
      </div>

      {value && (
        <p className="text-xs text-muted-foreground">
          Signed on {new Date(value.signed_at).toLocaleString()}
        </p>
      )}
    </Card>
  );
}
