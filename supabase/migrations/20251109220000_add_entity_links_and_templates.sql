-- Add entity linking fields to notes table
ALTER TABLE public.notes
ADD COLUMN linked_entity_type text CHECK (linked_entity_type IN ('customer', 'work_order', 'invoice', NULL)),
ADD COLUMN linked_entity_id uuid,
ADD COLUMN template_id uuid;

-- Create note templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('work', 'personal')),
  icon text,
  default_title text NOT NULL,
  default_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for entity links
CREATE INDEX IF NOT EXISTS idx_notes_linked_entity ON public.notes(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_template ON public.notes(template_id);

-- Add updated_at trigger for note_templates
CREATE TRIGGER update_note_templates_updated_at
  BEFORE UPDATE ON public.note_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to validate org-scoped entity links
CREATE OR REPLACE FUNCTION validate_note_entity_link()
RETURNS TRIGGER AS $$
DECLARE
  entity_org_id uuid;
  note_org_id uuid;
BEGIN
  -- If no entity is linked, allow
  IF NEW.linked_entity_id IS NULL OR NEW.linked_entity_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the note's org_id
  note_org_id := NEW.org_id;

  -- Get the linked entity's org_id based on type
  IF NEW.linked_entity_type = 'customer' THEN
    SELECT org_id INTO entity_org_id FROM public.customers WHERE id = NEW.linked_entity_id;
  ELSIF NEW.linked_entity_type = 'work_order' THEN
    SELECT org_id INTO entity_org_id FROM public.work_orders WHERE id = NEW.linked_entity_id;
  ELSIF NEW.linked_entity_type = 'invoice' THEN
    SELECT org_id INTO entity_org_id FROM public.invoices WHERE id = NEW.linked_entity_id;
  END IF;

  -- Validate org_id matches
  -- CRITICAL: Prevent cross-org linking (org to personal or vice versa)
  IF note_org_id IS NULL AND entity_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot link organization entity to personal note';
  END IF;

  IF note_org_id IS NOT NULL AND entity_org_id IS NULL THEN
    RAISE EXCEPTION 'Cannot link personal entity to organization note';
  END IF;

  IF note_org_id IS NOT NULL AND entity_org_id IS NOT NULL AND note_org_id != entity_org_id THEN
    RAISE EXCEPTION 'Cannot link entity from different organization';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to enforce org-scoping on entity links
CREATE TRIGGER enforce_note_entity_org_scope
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION validate_note_entity_link();

-- Insert system templates
INSERT INTO public.note_templates (name, description, category, icon, default_title, default_blocks) VALUES
-- Work Templates
('Job Site Visit', 'Document job site visits with customer info, photos, and observations', 'work', '🏗️', 'Job Site Visit - [Date]',
'[
  {"id": "block-1", "type": "heading", "content": "Customer Information", "level": 2},
  {"id": "block-2", "type": "paragraph", "content": "Customer: @customer"},
  {"id": "block-3", "type": "paragraph", "content": "Location: "},
  {"id": "block-4", "type": "paragraph", "content": "Date: "},
  {"id": "block-5", "type": "divider"},
  {"id": "block-6", "type": "heading", "content": "Site Observations", "level": 2},
  {"id": "block-7", "type": "paragraph", "content": ""},
  {"id": "block-8", "type": "divider"},
  {"id": "block-9", "type": "heading", "content": "Photos", "level": 2},
  {"id": "block-10", "type": "image", "url": "", "caption": ""},
  {"id": "block-11", "type": "divider"},
  {"id": "block-12", "type": "heading", "content": "Next Steps", "level": 2},
  {"id": "block-13", "type": "checklist", "items": [{"id": "item-1", "checked": false, "text": "Follow up with customer"}, {"id": "item-2", "checked": false, "text": "Order materials"}]}
]'::jsonb),

('Equipment Inspection', 'Track equipment condition and maintenance needs', 'work', '🔧', 'Equipment Inspection - [Equipment Name]',
'[
  {"id": "block-1", "type": "heading", "content": "Equipment Details", "level": 2},
  {"id": "block-2", "type": "paragraph", "content": "Equipment: "},
  {"id": "block-3", "type": "paragraph", "content": "Model/Serial: "},
  {"id": "block-4", "type": "paragraph", "content": "Inspection Date: "},
  {"id": "block-5", "type": "divider"},
  {"id": "block-6", "type": "heading", "content": "Inspection Checklist", "level": 2},
  {"id": "block-7", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": "Visual inspection - no damage"},
    {"id": "item-2", "checked": false, "text": "Safety features functional"},
    {"id": "item-3", "checked": false, "text": "Fluid levels adequate"},
    {"id": "item-4", "checked": false, "text": "No unusual sounds or vibrations"},
    {"id": "item-5", "checked": false, "text": "All controls operational"}
  ]},
  {"id": "block-8", "type": "divider"},
  {"id": "block-9", "type": "heading", "content": "Issues Found", "level": 2},
  {"id": "block-10", "type": "paragraph", "content": ""},
  {"id": "block-11", "type": "divider"},
  {"id": "block-12", "type": "heading", "content": "Maintenance Required", "level": 2},
  {"id": "block-13", "type": "checklist", "items": [{"id": "item-6", "checked": false, "text": "Schedule maintenance"}]}
]'::jsonb),

('Customer Meeting Notes', 'Record customer discussions and action items', 'work', '📋', 'Meeting with [Customer Name]',
'[
  {"id": "block-1", "type": "heading", "content": "Meeting Information", "level": 2},
  {"id": "block-2", "type": "paragraph", "content": "Customer: @customer"},
  {"id": "block-3", "type": "paragraph", "content": "Date/Time: "},
  {"id": "block-4", "type": "paragraph", "content": "Attendees: "},
  {"id": "block-5", "type": "divider"},
  {"id": "block-6", "type": "heading", "content": "Discussion Points", "level": 2},
  {"id": "block-7", "type": "paragraph", "content": ""},
  {"id": "block-8", "type": "divider"},
  {"id": "block-9", "type": "heading", "content": "Decisions Made", "level": 2},
  {"id": "block-10", "type": "paragraph", "content": ""},
  {"id": "block-11", "type": "divider"},
  {"id": "block-12", "type": "heading", "content": "Action Items", "level": 2},
  {"id": "block-13", "type": "checklist", "items": [{"id": "item-1", "checked": false, "text": ""}]}
]'::jsonb),

('Material Order', 'Plan and track material orders with costs', 'work', '📦', 'Material Order - [Project Name]',
'[
  {"id": "block-1", "type": "heading", "content": "Project Information", "level": 2},
  {"id": "block-2", "type": "paragraph", "content": "Project: "},
  {"id": "block-3", "type": "paragraph", "content": "Customer: @customer"},
  {"id": "block-4", "type": "paragraph", "content": "Order Date: "},
  {"id": "block-5", "type": "divider"},
  {"id": "block-6", "type": "heading", "content": "Materials Needed", "level": 2},
  {"id": "block-7", "type": "table", "rows": [
    [{"content": "Item"}, {"content": "Quantity"}, {"content": "Unit Price"}, {"content": "Total"}],
    [{"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}],
    [{"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}]
  ]},
  {"id": "block-8", "type": "divider"},
  {"id": "block-9", "type": "heading", "content": "Suppliers", "level": 2},
  {"id": "block-10", "type": "paragraph", "content": ""},
  {"id": "block-11", "type": "divider"},
  {"id": "block-12", "type": "heading", "content": "Notes", "level": 2},
  {"id": "block-13", "type": "paragraph", "content": ""}
]'::jsonb),

('Safety Incident Report', 'Document safety incidents and corrective actions', 'work', '⚠️', 'Safety Incident Report - [Date]',
'[
  {"id": "block-1", "type": "heading", "content": "Incident Details", "level": 2},
  {"id": "block-2", "type": "paragraph", "content": "Date/Time: "},
  {"id": "block-3", "type": "paragraph", "content": "Location: "},
  {"id": "block-4", "type": "paragraph", "content": "People Involved: "},
  {"id": "block-5", "type": "divider"},
  {"id": "block-6", "type": "heading", "content": "Incident Description", "level": 2},
  {"id": "block-7", "type": "paragraph", "content": ""},
  {"id": "block-8", "type": "divider"},
  {"id": "block-9", "type": "heading", "content": "Injuries/Damage", "level": 2},
  {"id": "block-10", "type": "paragraph", "content": ""},
  {"id": "block-11", "type": "divider"},
  {"id": "block-12", "type": "heading", "content": "Immediate Actions Taken", "level": 2},
  {"id": "block-13", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": "First aid administered"},
    {"id": "item-2", "checked": false, "text": "Area secured"},
    {"id": "item-3", "checked": false, "text": "Supervisor notified"}
  ]},
  {"id": "block-14", "type": "divider"},
  {"id": "block-15", "type": "heading", "content": "Corrective Actions", "level": 2},
  {"id": "block-16", "type": "checklist", "items": [{"id": "item-4", "checked": false, "text": ""}]}
]'::jsonb),

('Daily Work Log', 'Track daily activities and hours', 'work', '📅', 'Work Log - [Date]',
'[
  {"id": "block-1", "type": "heading", "content": "Date & Location", "level": 2},
  {"id": "block-2", "type": "paragraph", "content": "Date: "},
  {"id": "block-3", "type": "paragraph", "content": "Project/Location: "},
  {"id": "block-4", "type": "paragraph", "content": "Weather: "},
  {"id": "block-5", "type": "divider"},
  {"id": "block-6", "type": "heading", "content": "Tasks Completed", "level": 2},
  {"id": "block-7", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": ""},
    {"id": "item-2", "checked": false, "text": ""}
  ]},
  {"id": "block-8", "type": "divider"},
  {"id": "block-9", "type": "heading", "content": "Hours Worked", "level": 2},
  {"id": "block-10", "type": "paragraph", "content": "Start Time: "},
  {"id": "block-11", "type": "paragraph", "content": "End Time: "},
  {"id": "block-12", "type": "paragraph", "content": "Total Hours: "},
  {"id": "block-13", "type": "divider"},
  {"id": "block-14", "type": "heading", "content": "Notes & Issues", "level": 2},
  {"id": "block-15", "type": "paragraph", "content": ""}
]'::jsonb),

-- Personal Templates
('Grocery List', 'Organize your shopping with a checklist', 'personal', '🛒', 'Grocery List',
'[
  {"id": "block-1", "type": "heading", "content": "Produce", "level": 2},
  {"id": "block-2", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": "Apples"},
    {"id": "item-2", "checked": false, "text": "Bananas"},
    {"id": "item-3", "checked": false, "text": "Lettuce"}
  ]},
  {"id": "block-3", "type": "divider"},
  {"id": "block-4", "type": "heading", "content": "Dairy", "level": 2},
  {"id": "block-5", "type": "checklist", "items": [
    {"id": "item-4", "checked": false, "text": "Milk"},
    {"id": "item-5", "checked": false, "text": "Eggs"},
    {"id": "item-6", "checked": false, "text": "Cheese"}
  ]},
  {"id": "block-6", "type": "divider"},
  {"id": "block-7", "type": "heading", "content": "Meat & Protein", "level": 2},
  {"id": "block-8", "type": "checklist", "items": [
    {"id": "item-7", "checked": false, "text": "Chicken"},
    {"id": "item-8", "checked": false, "text": "Ground beef"}
  ]},
  {"id": "block-9", "type": "divider"},
  {"id": "block-10", "type": "heading", "content": "Pantry", "level": 2},
  {"id": "block-11", "type": "checklist", "items": [
    {"id": "item-9", "checked": false, "text": "Pasta"},
    {"id": "item-10", "checked": false, "text": "Rice"},
    {"id": "item-11", "checked": false, "text": "Bread"}
  ]},
  {"id": "block-12", "type": "divider"},
  {"id": "block-13", "type": "heading", "content": "Other", "level": 2},
  {"id": "block-14", "type": "checklist", "items": [{"id": "item-12", "checked": false, "text": ""}]}
]'::jsonb),

('Movies to Watch', 'Keep track of movies you want to watch', 'personal', '🎬', 'Movies to Watch',
'[
  {"id": "block-1", "type": "heading", "content": "Must Watch Soon", "level": 2},
  {"id": "block-2", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": "Movie title - streaming service"},
    {"id": "item-2", "checked": false, "text": ""}
  ]},
  {"id": "block-3", "type": "divider"},
  {"id": "block-4", "type": "heading", "content": "Want to Watch", "level": 2},
  {"id": "block-5", "type": "checklist", "items": [
    {"id": "item-3", "checked": false, "text": ""}
  ]},
  {"id": "block-6", "type": "divider"},
  {"id": "block-7", "type": "heading", "content": "Recently Watched", "level": 2},
  {"id": "block-8", "type": "table", "rows": [
    [{"content": "Title"}, {"content": "Rating"}, {"content": "Date"}, {"content": "Notes"}],
    [{"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}]
  ]}
]'::jsonb),

('Favorite Restaurants', 'Track your favorite places to eat', 'personal', '🍽️', 'Favorite Restaurants',
'[
  {"id": "block-1", "type": "heading", "content": "My Favorites", "level": 2},
  {"id": "block-2", "type": "table", "rows": [
    [{"content": "Name"}, {"content": "Cuisine"}, {"content": "Location"}, {"content": "Best Dish"}, {"content": "Rating"}],
    [{"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}],
    [{"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}]
  ]},
  {"id": "block-3", "type": "divider"},
  {"id": "block-4", "type": "heading", "content": "Want to Try", "level": 2},
  {"id": "block-5", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": "Restaurant name - cuisine type"}
  ]},
  {"id": "block-6", "type": "divider"},
  {"id": "block-7", "type": "heading", "content": "Notes", "level": 2},
  {"id": "block-8", "type": "paragraph", "content": "Add any special notes, reservations info, or recommendations here..."}
]'::jsonb),

('Books to Read', 'Track your reading list and reviews', 'personal', '📚', 'Books to Read',
'[
  {"id": "block-1", "type": "heading", "content": "Currently Reading", "level": 2},
  {"id": "block-2", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": "Book title - Author"}
  ]},
  {"id": "block-3", "type": "divider"},
  {"id": "block-4", "type": "heading", "content": "Want to Read", "level": 2},
  {"id": "block-5", "type": "checklist", "items": [
    {"id": "item-2", "checked": false, "text": ""}
  ]},
  {"id": "block-6", "type": "divider"},
  {"id": "block-7", "type": "heading", "content": "Completed Books", "level": 2},
  {"id": "block-8", "type": "table", "rows": [
    [{"content": "Title"}, {"content": "Author"}, {"content": "Rating"}, {"content": "Notes"}],
    [{"content": ""}, {"content": ""}, {"content": ""}, {"content": ""}]
  ]}
]'::jsonb),

('Travel Plans', 'Plan your trips and track memories', 'personal', '✈️', 'Travel to [Destination]',
'[
  {"id": "block-1", "type": "heading", "content": "Trip Details", "level": 2},
  {"id": "block-2", "type": "paragraph", "content": "Destination: "},
  {"id": "block-3", "type": "paragraph", "content": "Dates: "},
  {"id": "block-4", "type": "paragraph", "content": "Budget: "},
  {"id": "block-5", "type": "divider"},
  {"id": "block-6", "type": "heading", "content": "To Do Before Trip", "level": 2},
  {"id": "block-7", "type": "checklist", "items": [
    {"id": "item-1", "checked": false, "text": "Book flights"},
    {"id": "item-2", "checked": false, "text": "Book accommodation"},
    {"id": "item-3", "checked": false, "text": "Research activities"},
    {"id": "item-4", "checked": false, "text": "Make reservations"}
  ]},
  {"id": "block-8", "type": "divider"},
  {"id": "block-9", "type": "heading", "content": "Packing List", "level": 2},
  {"id": "block-10", "type": "checklist", "items": [
    {"id": "item-5", "checked": false, "text": "Passport/ID"},
    {"id": "item-6", "checked": false, "text": "Tickets"},
    {"id": "item-7", "checked": false, "text": "Clothing"}
  ]},
  {"id": "block-11", "type": "divider"},
  {"id": "block-12", "type": "heading", "content": "Places to Visit", "level": 2},
  {"id": "block-13", "type": "checklist", "items": [{"id": "item-8", "checked": false, "text": ""}]},
  {"id": "block-14", "type": "divider"},
  {"id": "block-15", "type": "heading", "content": "Trip Photos", "level": 2},
  {"id": "block-16", "type": "image", "url": "", "caption": ""}
]'::jsonb);

-- Enable RLS on note_templates
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view system templates
CREATE POLICY "Anyone can view system templates"
  ON public.note_templates
  FOR SELECT
  USING (is_system = true);

-- Grant permissions
GRANT SELECT ON public.note_templates TO authenticated;
