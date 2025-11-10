import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, LayoutDashboard, ClipboardList, FileText, Receipt, Package, Building, BarChart3, Folder, Users, Calendar, StickyNote } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/use-user-preferences";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFeatureNavigation } from "@/hooks/use-feature-navigation";

const iconMap: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  clipboard: ClipboardList,
  building: Building,
  "file-text": FileText,
  "file-invoice": Receipt,
  package: Package,
  "bar-chart": BarChart3,
  folder: Folder,
  users: Users,
  calendar: Calendar,
  notes: StickyNote,
};

interface NavItem {
  id: string;
  label: string;
  icon: string;
  fixed?: boolean;
}

function SortableItem({ item }: { item: NavItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: item.fixed });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = iconMap[item.icon] || ClipboardList;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg ${
        item.fixed ? "opacity-60 cursor-not-allowed" : "cursor-move hover:bg-accent"
      }`}
    >
      {!item.fixed && (
        <div {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      {item.fixed && <div className="w-5" />}
      <Icon className="h-5 w-5" />
      <span className="flex-1 font-medium">{item.label}</span>
      {item.fixed && <span className="text-xs text-muted-foreground">Fixed</span>}
    </div>
  );
}

export function NavigationOrderPreferences() {
  const [userId, setUserId] = useState<string | null>(null);
  const { data: preferences } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences();
  const { enabledNavItems } = useFeatureNavigation();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Build default nav items with Dashboard always first
    const defaultItems: NavItem[] = [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", fixed: true },
      { id: "calendar", label: "Calendar", icon: "calendar" },
      { id: "notes", label: "Notes", icon: "notes" },
    ];

    // Add enabled feature items
    enabledNavItems.forEach(item => {
      if (!item.isLocked) {
        // Convert path to id (e.g., "/work-orders" -> "work-orders")
        const id = item.path.substring(1);
        defaultItems.push({
          id,
          label: item.label,
          icon: item.icon || "clipboard",
        });
      }
    });

    // Apply saved order if exists
    if (preferences?.nav_order && Array.isArray(preferences.nav_order) && preferences.nav_order.length > 0) {
      const savedOrder = preferences.nav_order as string[];
      const orderedItems = savedOrder
        .map(id => defaultItems.find(item => item.id === id))
        .filter((item): item is NavItem => item !== undefined);

      // Add any new items that weren't in saved order
      const newItems = defaultItems.filter(
        item => !savedOrder.includes(item.id) && item.id !== "dashboard"
      );

      setNavItems([defaultItems[0], ...orderedItems.filter(i => i.id !== "dashboard"), ...newItems]);
    } else {
      setNavItems(defaultItems);
    }
  }, [userId, enabledNavItems, preferences]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setNavItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      // Don't allow moving Dashboard or moving items before Dashboard
      if (oldIndex === 0 || newIndex === 0) return items;

      const newItems = arrayMove(items, oldIndex, newIndex);
      setHasChanges(true);
      return newItems;
    });
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      // Extract order (excluding dashboard since it's always first)
      const order = navItems.filter(item => item.id !== "dashboard").map(item => item.id);

      await updatePreferences.mutateAsync({
        userId,
        quickAddEnabled: preferences?.quick_add_enabled || false,
        quickAddItems: preferences?.quick_add_items || [],
        navOrder: order,
      });

      setHasChanges(false);
      toast.success("Navigation order saved");
    } catch (error) {
      console.error("Error saving navigation order:", error);
      toast.error("Failed to save navigation order");
    }
  };

  const handleReset = () => {
    // Reset to default order
    const defaultItems: NavItem[] = [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", fixed: true },
      { id: "calendar", label: "Calendar", icon: "calendar" },
      { id: "notes", label: "Notes", icon: "notes" },
    ];

    enabledNavItems.forEach(item => {
      if (!item.isLocked) {
        const id = item.path.substring(1);
        defaultItems.push({
          id,
          label: item.label,
          icon: item.icon || "clipboard",
        });
      }
    });

    setNavItems(defaultItems);
    setHasChanges(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation Order</CardTitle>
        <CardDescription>
          Customize the order of navigation items in the sidebar. Dashboard always stays at the top.
          Drag items to reorder them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={navItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {navItems.map((item) => (
                <SortableItem key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={!hasChanges || updatePreferences.isPending}>
            {updatePreferences.isPending ? "Saving..." : "Save Order"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
