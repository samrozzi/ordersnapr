-- Fix RLS policy to allow unauthenticated access to global form templates
-- This enables the public overrun report page to work without authentication

-- Drop the existing policies that may require authentication
DROP POLICY IF EXISTS "Org members can view active templates" ON form_templates;
DROP POLICY IF EXISTS "Users can view templates" ON form_templates;

-- Create separate policies for public and org-specific template access
-- Policy 1: Allow anyone (including unauthenticated users) to view global templates
CREATE POLICY "Public can view global templates"
  ON form_templates FOR SELECT
  USING (
    is_global = true
    AND is_active = true
  );

-- Policy 2: Allow authenticated users to view their org's templates and templates without org
CREATE POLICY "Users can view templates"
  ON form_templates FOR SELECT
  USING (
    is_active = true
    AND (
      org_id IS NULL
      OR org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Ensure the overrun template is marked as global
-- First, update it if it exists (by ID or slug)
UPDATE form_templates
SET is_global = true
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid
   OR slug = 'overrun-report';

-- Then insert it if it doesn't exist at all
INSERT INTO form_templates (
  id,
  name,
  slug,
  category,
  is_active,
  is_global,
  schema
)
SELECT
  '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid,
  'Overrun Report',
  'overrun-report',
  'Operations',
  true,
  true,
  '{
    "title": "Overrun Report",
    "description": "Track technician overrun incidents",
    "sections": [
      {
        "title": "Overrun Details",
        "hideTitle": true,
        "fields": [
          {
            "type": "date",
            "key": "date",
            "label": "Date",
            "required": false,
            "hideLabel": false
          },
          {
            "type": "time",
            "key": "time",
            "label": "Time",
            "required": false,
            "hideLabel": false
          },
          {
            "type": "repeating_group",
            "key": "overrun_entries",
            "label": "Technician Entry",
            "required": false,
            "minInstances": 1,
            "maxInstances": 50,
            "fields": [
              {
                "type": "table_layout",
                "key": "technician_info",
                "label": "Technician Information",
                "tableRows": 2,
                "tableColumns": 2,
                "tableCells": {
                  "0-0": {"field": {"label": "Cell 0-0", "placeholder": ""}},
                  "0-1": {"field": {"label": "Cell 0-1", "placeholder": ""}},
                  "1-0": {"field": {"label": "Cell 1-0", "placeholder": ""}},
                  "1-1": {"field": {"label": "Cell 1-1", "placeholder": ""}}
                }
              },
              {
                "type": "text",
                "key": "ban_account",
                "label": "BAN/Account Number",
                "placeholder": "",
                "required": false
              },
              {
                "type": "time",
                "key": "rg_activate_time",
                "label": "RG Activate Time",
                "required": false
              },
              {
                "type": "time",
                "key": "call_time",
                "label": "Call time",
                "required": false
              },
              {
                "type": "smart_import",
                "key": "smart_import",
                "label": "Smart Import"
              }
            ]
          }
        ]
      }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM form_templates
  WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid
     OR slug = 'overrun-report'
);
