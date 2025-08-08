-- Add function to recalculate a user's total points based on daily_entries
CREATE OR REPLACE FUNCTION public.recalculate_profile_points(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles p
  SET total_points = COALESCE((
    SELECT SUM(points)
    FROM public.daily_entries de
    WHERE de.user_id = p_user_id
  ), 0),
  updated_at = now()
  WHERE p.user_id = p_user_id;
END;
$$;

-- Trigger functions to recalculate points after changes to daily_entries
CREATE OR REPLACE FUNCTION public.after_daily_entries_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_user_id = OLD.user_id;
  ELSE
    v_user_id = NEW.user_id;
  END IF;

  PERFORM public.recalculate_profile_points(v_user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for insert, update, delete on daily_entries
DROP TRIGGER IF EXISTS trg_daily_entries_aiud ON public.daily_entries;
CREATE TRIGGER trg_daily_entries_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.daily_entries
FOR EACH ROW
EXECUTE FUNCTION public.after_daily_entries_change();

-- Function to backfill penalty entries for missing days since profile creation until yesterday
CREATE OR REPLACE FUNCTION public.apply_missing_penalties(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_start_date DATE;
  v_inserted_count INTEGER;
BEGIN
  -- Determine tracking start date as the profile creation date (date only)
  SELECT created_at::date INTO v_start_date
  FROM public.profiles
  WHERE user_id = user_id_param;

  IF v_start_date IS NULL THEN
    RETURN 0; -- no profile found
  END IF;

  -- Insert penalty entries (-20) for any missing days from start date to yesterday
  WITH series AS (
    SELECT generate_series(v_start_date, CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day')::date AS d
  ), missing AS (
    SELECT s.d
    FROM series s
    LEFT JOIN public.daily_entries de
      ON de.user_id = user_id_param AND de.entry_date = s.d
    WHERE de.id IS NULL
  ), ins AS (
    INSERT INTO public.daily_entries (user_id, entry_date, choice, points)
    SELECT user_id_param, m.d, 'penalty', -20
    FROM missing m
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_count FROM ins;

  -- Recalculate points once after inserts
  PERFORM public.recalculate_profile_points(user_id_param);

  RETURN COALESCE(v_inserted_count, 0);
END;
$$;

-- Friendships table to support friends and competition
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_user_id)
);

-- Enable RLS and add policies for friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they are involved in
CREATE POLICY IF NOT EXISTS "Users can view their friendships"
ON public.friendships
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Users can create friendship requests they initiate
CREATE POLICY IF NOT EXISTS "Users can create friendship requests"
ON public.friendships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Either side can delete their friendship relation
CREATE POLICY IF NOT EXISTS "Users can delete their friendships"
ON public.friendships
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Only the invitee can accept (update status to accepted)
CREATE POLICY IF NOT EXISTS "Invitee can accept friendship"
ON public.friendships
FOR UPDATE
USING (auth.uid() = friend_user_id)
WITH CHECK (auth.uid() = friend_user_id);

-- Allow viewing profiles for accepted friendships (and own profile)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view friends profiles'
  ) THEN
    CREATE POLICY "Users can view friends profiles"
    ON public.profiles
    FOR SELECT
    USING (
      auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_user_id = profiles.user_id) OR
            (f.friend_user_id = auth.uid() AND f.user_id = profiles.user_id)
          )
      )
    );
  END IF;
END $$;

-- RPC to request a friend by email (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.request_friend_by_email(requester_user_id UUID, friend_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_friend_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Prevent self-friend
  SELECT p.user_id INTO v_friend_user_id FROM public.profiles p WHERE lower(p.email) = lower(friend_email);
  IF v_friend_user_id IS NULL THEN
    RETURN 'No user found with that email.';
  END IF;
  IF v_friend_user_id = requester_user_id THEN
    RETURN 'You cannot add yourself.';
  END IF;

  -- Check existing relation (either direction)
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user_id = requester_user_id AND f.friend_user_id = v_friend_user_id)
       OR (f.user_id = v_friend_user_id AND f.friend_user_id = requester_user_id)
  ) INTO v_exists;

  IF v_exists THEN
    RETURN 'Friend request already exists or you are already friends.';
  END IF;

  INSERT INTO public.friendships (user_id, friend_user_id, status)
  VALUES (requester_user_id, v_friend_user_id, 'pending');

  RETURN 'Friend request sent!';
END;
$$;