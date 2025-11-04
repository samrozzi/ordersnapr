-- Make form-attachments bucket public so images load properly
UPDATE storage.buckets 
SET public = true 
WHERE name = 'form-attachments';

-- Update all existing form templates to use maxFiles: 10 for file fields
UPDATE form_templates
SET schema = jsonb_set(
  schema,
  '{sections}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN section ? 'fields' THEN
          jsonb_set(
            section,
            '{fields}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN field->>'type' = 'file' AND (field->>'maxFiles')::int > 10 THEN
                    jsonb_set(field, '{maxFiles}', '10'::jsonb)
                  ELSE field
                END
              )
              FROM jsonb_array_elements(section->'fields') AS field
            )
          )
        ELSE section
      END
    )
    FROM jsonb_array_elements(schema->'sections') AS section
  )
)
WHERE schema IS NOT NULL
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(schema->'sections') AS section,
       jsonb_array_elements(section->'fields') AS field
  WHERE field->>'type' = 'file' 
  AND (field->>'maxFiles')::int > 10
);