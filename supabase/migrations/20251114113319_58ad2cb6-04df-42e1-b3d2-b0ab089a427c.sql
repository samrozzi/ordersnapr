-- Drop the existing widget_type check constraint
ALTER TABLE dashboard_widgets 
DROP CONSTRAINT IF EXISTS dashboard_widgets_widget_type_check;

-- Create a new constraint with all valid widget types
ALTER TABLE dashboard_widgets
ADD CONSTRAINT dashboard_widgets_widget_type_check
CHECK (widget_type = ANY (ARRAY[
  'calendar-small',
  'calendar-medium',
  'calendar-large',
  'weather',
  'favorites',
  'upcoming-work-orders',
  'pinned-forms',
  'recent-notes',
  'quick-stats',
  'notes-sticky',
  'water-tracker',
  'motivational-quote'
]::text[]));