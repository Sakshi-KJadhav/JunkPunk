-- Create function to increment user points
CREATE OR REPLACE FUNCTION public.increment_points(user_id_param uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET total_points = total_points + points_to_add,
      updated_at = now()
  WHERE user_id = user_id_param;
END;
$$;