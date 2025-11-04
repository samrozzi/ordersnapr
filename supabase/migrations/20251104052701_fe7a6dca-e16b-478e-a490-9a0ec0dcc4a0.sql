-- Update the organization-specific Overrun Report to use repeating groups
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
        'fields', jsonb_build_array(
          jsonb_build_object(
            'type', 'select',
            'key', 'technician',
            'label', 'Technician',
            'options', jsonb_build_array(
              'Mustafa Abdul-Khaliq - ma306g',
              'Micah Armstrong - ma091b',
              'Christian Romero - cr5822',
              'Rodrigo Mendez Linares - rx400k',
              'Olu Amusan - oa1451',
              'Gustavo Benitez - gb616h',
              'Joe Derusha - jd7292',
              'Christopher Macfarlane - cm044c',
              'Dewaine Williams - dw6876',
              'James Busto - jb477g',
              'Nayarit Chapman - nc6141',
              'Sheldon Abrams - sa821y',
              'Vincent Wilkes - vw6510',
              'Brian Tyson - bt0573'
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
  ),
  '{sections,0,hideTitle}',
  'true'::jsonb
)
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26';