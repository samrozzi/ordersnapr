-- Add RLS policy to allow public/anonymous access to global templates
CREATE POLICY "Allow public access to global templates" 
ON public.form_templates
FOR SELECT
USING (is_global = true AND is_active = true);

-- Update the Overrun Report template to be globally accessible
UPDATE public.form_templates 
SET is_global = true 
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26';