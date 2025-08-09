-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_user_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Create policies for friendships
CREATE POLICY "Users can view their own friendships"
ON public.friendships
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

CREATE POLICY "Users can create friendships"
ON public.friendships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friendships"
ON public.friendships
FOR UPDATE
USING (auth.uid() = friend_user_id);

-- Create function to request friend by email
CREATE OR REPLACE FUNCTION public.request_friend_by_email(
  requester_user_id UUID,
  friend_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  friend_user_id UUID;
  existing_friendship UUID;
BEGIN
  -- Find the user by email
  SELECT au.id INTO friend_user_id
  FROM auth.users au
  WHERE au.email = friend_email;
  
  IF friend_user_id IS NULL THEN
    RETURN 'User not found';
  END IF;
  
  -- Check if friendship already exists
  SELECT id INTO existing_friendship
  FROM public.friendships
  WHERE (user_id = requester_user_id AND friend_user_id = friend_user_id)
     OR (user_id = friend_user_id AND friend_user_id = requester_user_id);
  
  IF existing_friendship IS NOT NULL THEN
    RETURN 'Friendship already exists';
  END IF;
  
  -- Create friendship request
  INSERT INTO public.friendships (user_id, friend_user_id, status)
  VALUES (requester_user_id, friend_user_id, 'pending');
  
  RETURN 'Friend request sent';
END;
$$;

-- Create function to apply missing penalties
CREATE OR REPLACE FUNCTION public.apply_missing_penalties(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  penalty_count INTEGER := 0;
  missing_date DATE;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- Find missing dates (dates without entries up to yesterday)
  FOR missing_date IN
    SELECT generate_series::date
    FROM generate_series(
      COALESCE(
        (SELECT MAX(entry_date) FROM public.daily_entries WHERE user_id = user_id_param),
        CURRENT_DATE - INTERVAL '30 days'
      ) + INTERVAL '1 day',
      yesterday,
      INTERVAL '1 day'
    )
    WHERE generate_series::date NOT IN (
      SELECT entry_date 
      FROM public.daily_entries 
      WHERE user_id = user_id_param
    )
  LOOP
    -- Insert penalty entry
    INSERT INTO public.daily_entries (user_id, entry_date, choice, points)
    VALUES (user_id_param, missing_date, 'penalty', -5);
    
    penalty_count := penalty_count + 1;
  END LOOP;
  
  -- Update profile points
  IF penalty_count > 0 THEN
    PERFORM public.recalculate_profile_points(user_id_param);
  END IF;
  
  RETURN penalty_count;
END;
$$;

-- Create function to recalculate profile points
CREATE OR REPLACE FUNCTION public.recalculate_profile_points(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_points_calculated INTEGER;
BEGIN
  -- Calculate total points from daily entries
  SELECT COALESCE(SUM(points), 0)
  INTO total_points_calculated
  FROM public.daily_entries
  WHERE user_id = p_user_id;
  
  -- Update profile with calculated total
  UPDATE public.profiles
  SET total_points = total_points_calculated,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;