# Quick Wins Features - Implementation Guide

This document describes the Quick Wins features implemented in OrderSnapr to improve user experience and productivity.

## 🎯 Features Implemented

### 1. Global Search (Cmd+K / Ctrl+K)

**Location:** Header (desktop), activated via keyboard shortcut

**What it does:**
- Search across all entities: work orders, properties, forms, calendar events, customers
- Quick actions to create new records
- Shows recent favorites
- Keyboard accessible (Cmd+K or Ctrl+K)

**Files:**
- `/src/components/GlobalSearch.tsx` - Main component
- Integrated in `/src/components/AppLayout.tsx`

**Usage:**
- Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) anywhere in the app
- Start typing to search
- Press Enter or click to navigate to results
- Use Quick Actions to create new records without typing

**How it works:**
- Debounced search (300ms delay)
- Searches with ILIKE pattern matching (case-insensitive)
- Limits results to 5 per category
- Real-time search across multiple tables

---

### 2. Export to CSV/Excel

**Location:** Available as a reusable component for any list view

**What it does:**
- Export any data table to CSV or Excel
- Customizable columns and formatting
- Excel-compatible with UTF-8 BOM
- Automatic timestamp in filename

**Files:**
- `/src/lib/export-csv.ts` - Export utilities
- `/src/components/ExportButton.tsx` - Reusable button component

**How to use in your components:**

```tsx
import { ExportButton } from "@/components/ExportButton";
import { ExportColumn } from "@/lib/export-csv";

// Define columns
const exportColumns: ExportColumn<WorkOrder>[] = [
  { key: "job_number", label: "Job #" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  {
    key: "created_at",
    label: "Created",
    format: (date) => new Date(date).toLocaleDateString(),
  },
  {
    key: "creator.full_name",
    label: "Created By",
  },
];

// In your component
<ExportButton
  data={workOrders}
  columns={exportColumns}
  filename="work-orders"
  variant="outline"
/>
```

**Helper Functions:**
- `formatDateForExport(date)` - Format dates
- `formatCurrencyForExport(amount)` - Format currency
- `formatBooleanForExport(value)` - Format booleans as Yes/No
- `flattenObject(obj)` - Flatten nested objects for export

---

### 3. Bulk Actions

**Location:** Available as reusable hooks and components for list views

**What it does:**
- Select multiple items with checkboxes
- Perform bulk operations (update, delete, assign, etc.)
- Floating action bar appears when items selected
- Select all / clear selection

**Files:**
- `/src/hooks/use-bulk-select.ts` - Selection state management hook
- `/src/components/BulkActionBar.tsx` - Floating action bar

**How to use in your components:**

```tsx
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Checkbox } from "@/components/ui/checkbox";

function WorkOrdersList() {
  const [workOrders, setWorkOrders] = useState([...]);
  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useBulkSelect(workOrders);

  const bulkActions = [
    {
      label: "Mark as Complete",
      icon: <Check className="h-4 w-4" />,
      onClick: () => {
        // Bulk update logic
        selectedIds.forEach(id => markAsComplete(id));
        clearSelection();
      },
    },
    {
      label: "Delete Selected",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {
        // Bulk delete logic
        selectedIds.forEach(id => deleteWorkOrder(id));
        clearSelection();
      },
      variant: "destructive",
    },
  ];

  return (
    <>
      {/* Header with Select All */}
      <Checkbox
        checked={isAllSelected}
        onCheckedChange={toggleAll}
        aria-label="Select all"
      />

      {/* List items */}
      {workOrders.map(wo => (
        <div key={wo.id}>
          <Checkbox
            checked={isSelected(wo.id)}
            onCheckedChange={() => toggleItem(wo.id)}
          />
          {/* ... rest of item */}
        </div>
      ))}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
    </>
  );
}
```

---

### 4. In-App Notifications

**Location:** Header (bell icon), activated via click

**What it does:**
- Display in-app notifications
- Unread count badge
- Mark as read / Mark all as read
- Delete notifications
- Auto-navigate to related entities

**Files:**
- `/supabase/migrations/20250108000000_create_notifications.sql` - Database schema
- `/src/hooks/use-notifications.ts` - Notifications hook
- `/src/components/NotificationCenter.tsx` - Notification popover

**Database Schema:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  org_id UUID REFERENCES organizations,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT, -- 'info', 'success', 'warning', 'error'
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  icon TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**How to create notifications programmatically:**

```tsx
// In your code (e.g., after creating a work order)
await supabase.from("notifications").insert({
  user_id: assigneeId,
  org_id: orgId,
  title: "New Work Order Assigned",
  message: `You've been assigned to "${workOrder.title}"`,
  type: "info",
  entity_type: "work_order",
  entity_id: workOrder.id,
  action_url: `/work-orders/${workOrder.id}`,
  icon: "Briefcase",
});
```

**Using the hook:**

```tsx
import { useNotifications } from "@/hooks/use-notifications";

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  return (
    <div>
      <span>Unread: {unreadCount}</span>
      {notifications.map(n => (
        <div key={n.id} onClick={() => markAsRead(n.id)}>
          {n.title}
        </div>
      ))}
    </div>
  );
}
```

---

### 5. Quick Add Button (FAB)

**Location:** Fixed bottom-right corner (floating action button)

**What it does:**
- Quick access to create new records
- Contextual based on enabled features
- Floating action button pattern
- Mobile-friendly

**Files:**
- `/src/components/QuickAddButton.tsx`
- Integrated in `/src/components/AppLayout.tsx`

**Customization:**
- Automatically filters actions based on enabled org features
- Add more actions by editing the `actions` array in `QuickAddButton.tsx`

---

### 6. Activity Feed

**Location:** Can be added to any page (commonly Dashboard)

**What it does:**
- Show recent activity across the organization
- Recent work orders, forms, events, etc.
- Shows who did what and when
- Avatar with user initials

**Files:**
- `/src/components/ActivityFeed.tsx`

**How to use:**

```tsx
import { ActivityFeed } from "@/components/ActivityFeed";

function Dashboard() {
  return (
    <div className="grid gap-4">
      {/* Other dashboard widgets */}
      <ActivityFeed limit={20} />
    </div>
  );
}
```

**Customization:**
- Adjust `limit` prop to show more/fewer items
- Automatically filters to current organization

---

## 📝 Implementation Examples

### Example 1: Add Export to Work Orders List

```tsx
// In src/pages/WorkOrders.tsx

import { ExportButton } from "@/components/ExportButton";
import { formatDateForExport } from "@/lib/export-csv";

const exportColumns = [
  { key: "job_number", label: "Job #" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  {
    key: "created_at",
    label: "Created",
    format: formatDateForExport,
  },
  {
    key: "creator.full_name",
    label: "Created By",
  },
];

// In your JSX
<div className="flex gap-2">
  <Button onClick={() => navigate("/work-orders/new")}>
    New Work Order
  </Button>
  <ExportButton
    data={workOrders}
    columns={exportColumns}
    filename="work-orders"
  />
</div>
```

### Example 2: Add Bulk Actions to Properties List

```tsx
// In src/pages/PropertyInfo.tsx

import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Checkbox } from "@/components/ui/checkbox";

function PropertyInfo() {
  const [properties, setProperties] = useState([]);
  const bulk = useBulkSelect(properties);

  const handleBulkDelete = async () => {
    for (const id of bulk.selectedIds) {
      await supabase.from("properties").delete().eq("id", id);
    }
    bulk.clearSelection();
    // Refresh list
  };

  return (
    <>
      {/* Header */}
      <Checkbox
        checked={bulk.isAllSelected}
        onCheckedChange={bulk.toggleAll}
      />

      {/* List */}
      {properties.map(property => (
        <div key={property.id}>
          <Checkbox
            checked={bulk.isSelected(property.id)}
            onCheckedChange={() => bulk.toggleItem(property.id)}
          />
          {/* ... */}
        </div>
      ))}

      <BulkActionBar
        selectedCount={bulk.selectedCount}
        onClearSelection={bulk.clearSelection}
        actions={[
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: "destructive",
          },
        ]}
      />
    </>
  );
}
```

---

## 🚀 Next Steps

### Recommended Enhancements:

1. **Add Export to More Pages:**
   - Work Orders ✅ (add to existing page)
   - Properties ✅ (add to existing page)
   - Forms ✅ (add to existing page)
   - Calendar Events
   - Invoices (when implemented)

2. **Add Bulk Actions to More Pages:**
   - Work Orders (bulk status update, bulk assign)
   - Properties (bulk delete, bulk tag)
   - Forms (bulk approve, bulk reject)

3. **Notification Triggers:**
   - Work order assigned → notify assignee
   - Work order completed → notify customer
   - Form submitted → notify admin
   - Invoice overdue → notify customer
   - Appointment reminder → notify technician & customer

4. **Activity Feed Enhancements:**
   - Add to Dashboard as a widget
   - Filter by activity type
   - Filter by user
   - Search within activity

5. **Global Search Enhancements:**
   - Add search history
   - Add keyboard navigation
   - Add more entity types (invoices, inventory, etc.)

---

## 🎨 Customization

All components use Tailwind CSS and shadcn/ui components, so they automatically inherit your brand colors and theme settings.

**Global Search:**
- Modify search filters in `GlobalSearch.tsx`
- Add more quick actions
- Customize result display

**Export:**
- Add custom formatters for specific data types
- Add PDF export option
- Add email export option

**Notifications:**
- Customize notification types
- Add sound/vibration alerts
- Add notification preferences

**Quick Add:**
- Add/remove actions based on your workflows
- Customize button appearance
- Add keyboard shortcuts

---

## 🐛 Troubleshooting

### Global Search not working?
- Check if `cmdk` is installed: `npm install cmdk`
- Verify keyboard shortcut isn't conflicting with browser shortcuts

### Export not downloading?
- Check browser popup blocker settings
- Verify data is not empty
- Check console for errors

### Notifications not appearing?
- Run the migration: `supabase db push`
- Verify RLS policies are enabled
- Check if user is authenticated

### Bulk actions not showing?
- Ensure items are selected
- Check if `BulkActionBar` is rendered
- Verify `selectedCount > 0`

---

## 📚 Resources

- [shadcn/ui Components](https://ui.shadcn.com/)
- [cmdk Documentation](https://cmdk.paco.me/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Feature Checklist

- [x] Global Search (Cmd+K)
- [x] Export to CSV/Excel
- [x] Bulk Actions
- [x] In-App Notifications
- [x] Quick Add Button (FAB)
- [x] Activity Feed
- [ ] Add to Work Orders page
- [ ] Add to Properties page
- [ ] Add to Forms page
- [ ] Create notification triggers
- [ ] Add Activity Feed to Dashboard

---

**Questions?** Check the code comments in each component for detailed implementation notes.
