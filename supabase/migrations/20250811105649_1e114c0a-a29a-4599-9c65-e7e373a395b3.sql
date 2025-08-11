-- Fix the search path for the trigger function
CREATE OR REPLACE FUNCTION public.update_profile_points_on_entry_change()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT and UPDATE, use NEW row
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.recalculate_profile_points(NEW.user_id);
    RETURN NEW;
  END IF;
  
  -- For DELETE, use OLD row
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_profile_points(OLD.user_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';