import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export function NotificationCenter() {
  return (
    <Button variant="ghost" size="icon" className="relative" disabled>
      <Bell className="h-5 w-5" />
    </Button>
  );
}
