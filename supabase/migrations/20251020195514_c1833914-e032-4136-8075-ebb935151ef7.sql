-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_name TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  access_information TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies for property access
CREATE POLICY "Approved users can view own properties" 
ON public.properties 
FOR SELECT 
USING ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

CREATE POLICY "Approved users can create own properties" 
ON public.properties 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

CREATE POLICY "Approved users can update own properties" 
ON public.properties 
FOR UPDATE 
USING ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

CREATE POLICY "Approved users can delete own properties" 
ON public.properties 
FOR DELETE 
USING ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();