import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BaseWidgetProps {
  children: ReactNode;
  size: "small" | "medium" | "large";
  isEditMode?: boolean;
  onRemove?: () => void;
  className?: string;
}

export const BaseWidget = ({
  children,
  size,
  isEditMode = false,
  onRemove,
  className,
}: BaseWidgetProps) => {
  const sizeClasses = {
    small: "h-[180px]",
    medium: "h-[280px]",
    large: "h-[380px]",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-lg",
        sizeClasses[size],
        className
      )}
    >
      {isEditMode && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="p-4 h-full">{children}</CardContent>
    </Card>
  );
};
