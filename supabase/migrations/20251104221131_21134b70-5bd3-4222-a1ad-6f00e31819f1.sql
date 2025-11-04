-- Fix audit log function to handle tables without status column
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  action_type text;
  has_status boolean;
BEGIN
  -- Check if the table has a status column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'status'
  ) INTO has_status;

  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes)
    VALUES (NEW.user_id, TG_TABLE_NAME, NEW.id, action_type, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
    
    -- Only check status if the table has a status column
    IF has_status THEN
      IF (to_jsonb(NEW)->>'status') = 'completed' AND (to_jsonb(OLD)->>'status') != 'completed' THEN
        action_type := 'completed';
      END IF;
    END IF;
    
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes)
    VALUES (NEW.user_id, TG_TABLE_NAME, NEW.id, action_type, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
  END IF;
  
  RETURN NEW;
END;
$function$;