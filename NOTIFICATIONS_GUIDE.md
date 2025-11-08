# Notification System - How It Works

## Overview

The notification system is now fully set up in OrderSnapr. Here's what exists and how to use it:

## What's Already Working

### 1. **Notification Center UI** ✅
- Bell icon in the header
- Unread count badge
- Click to view notifications
- Mark as read/delete functionality

### 2. **Database Schema** ✅
- `notifications` table created via migration
- RLS policies for security
- Auto-cleanup of old read notifications (30 days)

### 3. **Hook for Easy Access** ✅
- `useNotifications()` hook available
- Functions: `markAsRead()`, `markAllAsRead()`, `deleteNotification()`

---

## How to Create Notifications

### Manual Creation (Programmatically)

You can create notifications anywhere in your code when events happen:

```tsx
import { supabase } from "@/integrations/supabase/client";

// Example: When a work order is assigned
await supabase.from("notifications").insert({
  user_id: assigneeUserId,  // Who should receive the notification
  org_id: organizationId,
  title: "New Work Order Assigned",
  message: `You've been assigned to "${workOrder.title}"`,
  type: "info",  // 'info' | 'success' | 'warning' | 'error'
  entity_type: "work_order",
  entity_id: workOrder.id,
  action_url: `/work-orders`,  // Where to navigate when clicked
  icon: "Briefcase",  // Lucide icon name
});
```

---

## Common Use Cases & Examples

### 1. Work Order Assignment

**When:** A work order is assigned to a user

**Where to add:** In the work order assignment logic

```tsx
// In WorkOrderForm.tsx or wherever assignment happens
async function assignWorkOrder(workOrderId, assigneeId, workOrderTitle) {
  // ... your existing assignment logic ...

  // Create notification
  const { data: assignee } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", assigneeId)
    .single();

  if (assignee) {
    await supabase.from("notifications").insert({
      user_id: assigneeId,
      org_id: assignee.organization_id,
      title: "New Assignment",
      message: `You've been assigned to work order: ${workOrderTitle}`,
      type: "info",
      entity_type: "work_order",
      entity_id: workOrderId,
      action_url: `/work-orders`,
    });
  }
}
```

### 2. Work Order Completion

**When:** A work order is marked as complete

**Where to add:** In the status update logic

```tsx
// When status changes to 'completed'
if (newStatus === 'completed' && workOrder.user_id) {
  const { data: creator } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", workOrder.user_id)
    .single();

  if (creator) {
    await supabase.from("notifications").insert({
      user_id: workOrder.user_id,  // Notify the creator
      org_id: creator.organization_id,
      title: "Work Order Completed",
      message: `Work order "${workOrder.title}" has been completed`,
      type: "success",
      entity_type: "work_order",
      entity_id: workOrder.id,
      action_url: `/work-orders`,
    });
  }
}
```

### 3. Form Submission

**When:** A form is submitted for review

**Where to add:** In the form submission logic

```tsx
// After form is submitted
async function onFormSubmit(formData, formId, formName) {
  // ... save form logic ...

  // Notify org admins
  const { data: admins } = await supabase
    .from("org_memberships")
    .select("user_id, organizations!inner(id)")
    .eq("organizations.id", orgId)
    .in("role", ["owner", "admin"]);

  if (admins) {
    const notifications = admins.map(admin => ({
      user_id: admin.user_id,
      org_id: orgId,
      title: "New Form Submission",
      message: `${formName} has been submitted for review`,
      type: "info",
      entity_type: "form_submission",
      entity_id: formId,
      action_url: `/forms`,
    }));

    await supabase.from("notifications").insert(notifications);
  }
}
```

### 4. Calendar Event Reminder

**When:** 1 hour before a scheduled event

**Where to add:** In a scheduled Edge Function or cron job

```tsx
// This would typically run in a Supabase Edge Function on a schedule
export async function sendEventReminders() {
  const oneHourFromNow = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

  const { data: upcomingEvents } = await supabase
    .from("calendar_events")
    .select("*, assigned_to")
    .gte("start_time", new Date().toISOString())
    .lte("start_time", oneHourFromNow.toISOString());

  if (upcomingEvents) {
    const notifications = upcomingEvents
      .filter(event => event.assigned_to)
      .map(event => ({
        user_id: event.assigned_to,
        org_id: event.organization_id,
        title: "Upcoming Event",
        message: `"${event.title}" starts in 1 hour`,
        type: "warning",
        entity_type: "calendar_event",
        entity_id: event.id,
        action_url: `/calendar`,
      }));

    await supabase.from("notifications").insert(notifications);
  }
}
```

---

## Notification Types

```tsx
type: "info"      // General information (blue)
type: "success"   // Positive action (green)
type: "warning"   // Needs attention (yellow)
type: "error"     // Problem occurred (red)
```

---

## Where to Add Notification Logic

### Recommended Locations:

1. **Work Order Events:**
   - `src/components/WorkOrderForm.tsx` - On create/update
   - `src/components/WorkOrderDetails.tsx` - On status change
   - `src/pages/WorkOrders.tsx` - On assignment

2. **Form Events:**
   - `src/components/FormBuilder.tsx` - On template publish
   - `src/components/FormRenderer.tsx` - On submission
   - Form approval/rejection logic

3. **Calendar Events:**
   - `src/components/CalendarView.tsx` - On event create
   - Scheduled Edge Function for reminders

4. **System Events:**
   - User approval/rejection in Admin panel
   - Org settings changes
   - Feature enablement

---

## Automated Triggers (Future Enhancement)

To make notifications truly automatic, you could create Supabase Database Triggers:

### Example: Trigger on Work Order Assignment

```sql
-- Create a function to send notification
CREATE OR REPLACE FUNCTION notify_work_order_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned_to changed
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, org_id, title, message, type, entity_type, entity_id, action_url)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'New Assignment',
      'You have been assigned to work order: ' || COALESCE(NEW.title, 'Untitled'),
      'info',
      'work_order',
      NEW.id,
      '/work-orders'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER work_order_assignment_notification
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_work_order_assigned();
```

You can add this trigger via Supabase Dashboard → SQL Editor

---

## Testing Notifications

### Quick Test:

1. Open browser console
2. Run this in the console:

```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Get org_id
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single();

// Create test notification
await supabase.from('notifications').insert({
  user_id: user.id,
  org_id: profile.organization_id,
  title: 'Test Notification',
  message: 'This is a test notification!',
  type: 'info',
  action_url: '/dashboard',
});

// Refresh the page and check the bell icon!
```

---

## FAQ

**Q: Why don't I see any notifications?**
A: Notifications are created programmatically. Add the code snippets above to your event handlers, or create test notifications via console.

**Q: Can I customize notification appearance?**
A: Yes! Edit `/src/components/NotificationCenter.tsx` to change colors, icons, layout.

**Q: How do I send notifications to multiple users?**
A: Insert multiple rows with different `user_id` values (see Form Submission example above).

**Q: Can I add email/SMS notifications?**
A: Not yet - that's a future enhancement. Currently, these are in-app only.

**Q: How long do notifications stay?**
A: Unread notifications stay forever. Read notifications auto-delete after 30 days.

---

## Next Steps

1. **Add to Work Orders:** Implement assignment notifications (see example above)
2. **Add to Forms:** Notify admins on submission
3. **Database Triggers:** Automate common scenarios
4. **Email Integration:** Add SendGrid/Resend for email notifications (Phase 2)

---

**Questions?** Check the code in:
- `/src/hooks/use-notifications.ts` - Hook implementation
- `/src/components/NotificationCenter.tsx` - UI component
- `/supabase/migrations/20250108000000_create_notifications.sql` - Database schema
