import { Plus, Calendar, Cloud, Star, ClipboardList, FileText, StickyNote, TrendingUp, Droplet, MessageCircle } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

interface AddWidgetDialogProps {
  onAddWidget: (type: "calendar-small" | "calendar-medium" | "calendar-large" | "weather" | "favorites" | "upcoming-work-orders" | "pinned-forms" | "recent-notes" | "quick-stats" | "notes-sticky" | "water-tracker" | "motivational-quote") => void;
}

export const AddWidgetDialog = ({ onAddWidget }: AddWidgetDialogProps) => {
  const widgetCategories = [
    {
      category: "Calendar & Time",
      widgets: [
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
      ],
    },
    {
      category: "Work & Projects",
      widgets: [
        {
          type: "upcoming-work-orders" as const,
          name: "Upcoming Work Orders",
          description: "Next 5 work orders with day/week/month filter",
          icon: ClipboardList,
        },
        {
          type: "quick-stats" as const,
          name: "Quick Stats",
          description: "Active jobs, pending invoices, and customers",
          icon: TrendingUp,
        },
      ],
    },
    {
      category: "Content & Notes",
      widgets: [
        {
          type: "pinned-forms" as const,
          name: "Pinned Forms",
          description: "Quick access to your pinned form submissions",
          icon: FileText,
        },
        {
          type: "recent-notes" as const,
          name: "Recent Notes",
          description: "Recently updated notes and templates",
          icon: StickyNote,
        },
        {
          type: "favorites" as const,
          name: "Favorites",
          description: "Quick access to your favorited items",
          icon: Star,
        },
        {
          type: "notes-sticky" as const,
          name: "Sticky Note",
          description: "Quick jot-down notes or favorite note viewer",
          icon: StickyNote,
        },
      ],
    },
    {
      category: "Wellness & Motivation",
      widgets: [
        {
          type: "water-tracker" as const,
          name: "Water Tracker",
          description: "Track your daily water intake with visual progress",
          icon: Droplet,
        },
        {
          type: "motivational-quote" as const,
          name: "Quote of the Day",
          description: "Daily motivational quotes for inspiration",
          icon: MessageCircle,
        },
      ],
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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {widgetCategories.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {category.category}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {category.widgets.map((widget) => {
                  const Icon = widget.icon;
                  return (
                    <Card
                      key={widget.type}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => {
                        onAddWidget(widget.type);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">{widget.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {widget.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {category !== widgetCategories[widgetCategories.length - 1] && (
                <Separator className="mt-6" />
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
