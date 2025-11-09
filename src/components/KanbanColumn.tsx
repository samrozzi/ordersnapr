import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div className="flex-shrink-0 w-[320px]">
      <Card className={isOver ? "ring-2 ring-primary" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={setNodeRef} className="min-h-[200px]">
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
