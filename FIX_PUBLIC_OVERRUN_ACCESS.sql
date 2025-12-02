-- ============================================================================
-- IMMEDIATE FIX: Allow public access to the Overrun Report form
-- ============================================================================
-- Run this in your Supabase SQL Editor to fix the public overrun page
-- This will allow unauthenticated users to view the form at /private/overrun
-- ============================================================================

-- Step 1: Drop the existing restrictive policy
DROP POLICY IF EXISTS "Org members can view active templates" ON form_templates;

-- Step 2: Create policy to allow public access to global templates
CREATE POLICY "Public can view global templates"
  ON form_templates FOR SELECT
  USING (
    is_global = true
    AND is_active = true
  );

-- Step 3: Create policy to allow org members to view their org templates
CREATE POLICY "Org members can view org templates"
  ON form_templates FOR SELECT
  USING (
    org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_active = true
  );

-- Step 4: Ensure the overrun template is marked as global
UPDATE form_templates
SET is_global = true
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid;

-- Step 5: If the template doesn't exist, create it
-- (This will do nothing if it already exists due to the ON CONFLICT clause)
INSERT INTO form_templates (
  id,
  name,
  slug,
  category,
  is_active,
  is_global,
  schema
)
VALUES (
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
)
ON CONFLICT (id) DO NOTHING;

-- Verify the changes
SELECT
  id,
  name,
  is_global,
  is_active,
  slug
FROM form_templates
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid;
