import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Move, ZoomIn } from "lucide-react";

interface BannerImageCropperProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (position: { x: number; y: number; scale: number }) => void;
  initialPosition?: { x: number; y: number; scale: number };
}

export function BannerImageCropper({ 
  imageUrl, 
  open, 
  onClose, 
  onSave,
  initialPosition = { x: 50, y: 50, scale: 1 }
}: BannerImageCropperProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition(initialPosition);
  }, [open, imageUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    setPosition(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, prev.x + (deltaX / containerWidth) * 100)),
      y: Math.max(0, Math.min(100, prev.y + (deltaY / containerHeight) * 100)),
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onSave(position);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Position Banner Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={containerRef}
            className="relative w-full h-64 bg-muted rounded-lg overflow-hidden cursor-move border-2 border-dashed"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: `${position.scale * 100}%`,
                backgroundPosition: `${position.x}% ${position.y}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
                Drag to reposition
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              <span className="text-sm font-medium">Zoom: {position.scale.toFixed(1)}x</span>
            </div>
            <Slider
              value={[position.scale]}
              onValueChange={([scale]) => setPosition(prev => ({ ...prev, scale }))}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• Drag the image to reposition it within the banner area</p>
            <p>• Use the zoom slider to adjust the image size</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
