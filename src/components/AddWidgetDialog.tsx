import { Plus, Calendar, Cloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AddWidgetDialogProps {
  onAddWidget: (type: "calendar-small" | "calendar-medium" | "calendar-large" | "weather") => void;
}

export const AddWidgetDialog = ({ onAddWidget }: AddWidgetDialogProps) => {
  const widgetTypes = [
    {
      type: "calendar-small" as const,
      name: "Calendar (Small)",
      description: "Quick view of today and next 2 events",
      icon: Calendar,
    },
    {
      type: "calendar-medium" as const,
      name: "Calendar (Medium)",
      description: "Week view with upcoming events",
      icon: Calendar,
    },
    {
      type: "calendar-large" as const,
      name: "Calendar (Large)",
      description: "Full month view with event indicators",
      icon: Calendar,
    },
    {
      type: "weather" as const,
      name: "Weather",
      description: "Current weather and forecast",
      icon: Cloud,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {widgetTypes.map((widget) => {
            const Icon = widget.icon;
            return (
              <Card
                key={widget.type}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  onAddWidget(widget.type);
                  // Dialog will close automatically
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{widget.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {widget.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
