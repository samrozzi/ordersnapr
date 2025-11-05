-- Update storage bucket to support large Apple Health files (up to 250MB)
-- and add support for ZIP and XML MIME types

UPDATE storage.buckets
SET
  file_size_limit = 262144000, -- 250MB in bytes
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'application/zip',
    'application/x-zip-compressed',
    'application/xml',
    'text/xml'
  ]
WHERE id = 'form-attachments';
