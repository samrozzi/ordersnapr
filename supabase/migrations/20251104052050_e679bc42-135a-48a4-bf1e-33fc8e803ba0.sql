-- Update Overrun Report template to use repeating groups
UPDATE form_templates
SET schema = jsonb_set(
  jsonb_set(
    schema,
    '{sections,0,fields}',
    jsonb_build_array(
      jsonb_build_object(
        'type', 'date',
        'key', 'date',
        'label', 'Date',
        'required', false,
        'hideLabel', false
      ),
      jsonb_build_object(
        'type', 'time',
        'key', 'time',
        'label', 'Time',
        'required', false,
        'hideLabel', false
      ),
      jsonb_build_object(
        'type', 'repeating_group',
        'key', 'overrun_entries',
        'label', 'Overrun Entry',
        'required', false,
        'minInstances', 1,
        'maxInstances', 50,
        'fields', (
          SELECT jsonb_build_array(
            jsonb_build_object(
              'type', 'select',
              'key', 'technician',
              'label', 'Technician',
              'options', COALESCE(
                (
                  SELECT field->'options'
                  FROM jsonb_array_elements(schema->'sections'->0->'fields') AS field
                  WHERE field->>'key' = 'technician'
                  LIMIT 1
                ),
                '["ma306g", "cr5822", "oa1451", "tg6503"]'::jsonb
              ),
              'required', false,
              'hideLabel', false
            ),
            jsonb_build_object(
              'type', 'textarea',
              'key', 'description',
              'label', 'Description',
              'placeholder', 'Enter overrun details...',
              'required', false,
              'hideLabel', false
            )
          )
        )
      )
    )
  ),
  '{sections,0,hideTitle}',
  'true'::jsonb
)
WHERE name = 'Overrun Report'
  AND org_id IS NULL;