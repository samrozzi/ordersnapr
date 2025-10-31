-- Drop the old check constraint
ALTER TABLE dashboard_widgets DROP CONSTRAINT IF EXISTS dashboard_widgets_widget_type_check;

-- Add new check constraint with all widget types
ALTER TABLE dashboard_widgets ADD CONSTRAINT dashboard_widgets_widget_type_check 
CHECK (widget_type IN ('calendar-small', 'calendar-medium', 'calendar-large', 'weather', 'favorites', 'upcoming-work-orders'));