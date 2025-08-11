-- Create trigger to automatically recalculate profile points when daily entries change
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on daily_entries table
DROP TRIGGER IF EXISTS trigger_update_profile_points ON public.daily_entries;
CREATE TRIGGER trigger_update_profile_points
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_points_on_entry_change();