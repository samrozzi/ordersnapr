-- Remove default values from all fields in existing form templates
UPDATE form_templates
SET schema = jsonb_set(
  schema,
  '{sections}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        section,
        '{fields}',
        (
          SELECT jsonb_agg(field - 'default')
          FROM jsonb_array_elements(section->'fields') AS field
        )
      )
    )
    FROM jsonb_array_elements(schema->'sections') AS section
  )
)
WHERE schema IS NOT NULL
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(schema->'sections') AS section,
       jsonb_array_elements(section->'fields') AS field
  WHERE field ? 'default'
);