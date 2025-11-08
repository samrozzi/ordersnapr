import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { X, MoreVertical } from "lucide-react";
import { ReactNode } from "react";

interface BulkAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  show?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  actions,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const visibleActions = actions.filter((action) => action.show !== false);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{selectedCount} selected</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 px-2 text-primary-foreground hover:text-primary-foreground/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        {visibleActions.length > 0 && (
          <div className="flex items-center gap-2">
            {visibleActions.slice(0, 2).map((action, index) => (
              <Button
                key={index}
                variant="secondary"
                size="sm"
                onClick={action.onClick}
                className="h-8"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}

            {visibleActions.length > 2 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="h-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {visibleActions.slice(2).map((action, index) => (
                    <div key={index}>
                      {index > 0 && action.variant === "destructive" && (
                        <DropdownMenuSeparator />
                      )}
                      <DropdownMenuItem
                        onClick={action.onClick}
                        className={
                          action.variant === "destructive"
                            ? "text-destructive focus:text-destructive"
                            : ""
                        }
                      >
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
