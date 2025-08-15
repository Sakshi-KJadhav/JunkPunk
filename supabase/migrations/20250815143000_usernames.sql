-- Add username column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Enforce simple format (3-30 chars, letters/numbers/underscore) while allowing NULL until user sets it
ALTER TABLE public.profiles
  ADD CONSTRAINT IF NOT EXISTS profiles_username_format
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,30}$');

-- Case-insensitive uniqueness on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_ci
  ON public.profiles ((lower(username)));

-- RPC: Check if a username is available (case-insensitive)
CREATE OR REPLACE FUNCTION public.is_username_available(candidate TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE lower(p.username) = lower(candidate)
  );
$$;

-- RPC: Search user by username (exact, case-insensitive)
CREATE OR REPLACE FUNCTION public.search_user_by_username(search_username TEXT)
RETURNS TABLE(user_id UUID, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.username
  FROM public.profiles p
  WHERE lower(p.username) = lower(search_username)
  LIMIT 1;
END;
$$;

-- Update weekly leaderboard RPC to return username
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(
  week_start DATE,
  week_end DATE
)
RETURNS TABLE(user_id UUID, username TEXT, week_points INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH friend_ids AS (
    SELECT DISTINCT CASE WHEN f.user_id = auth.uid() THEN f.friend_user_id ELSE f.user_id END AS uid
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.user_id = auth.uid() OR f.friend_user_id = auth.uid())
    UNION
    SELECT auth.uid()
  ),
  sums AS (
    SELECT de.user_id, COALESCE(SUM(de.points), 0) AS week_points
    FROM public.daily_entries de
    WHERE de.entry_date >= week_start
      AND de.entry_date <= week_end
      AND de.user_id IN (SELECT uid FROM friend_ids)
    GROUP BY de.user_id
  )
  SELECT p.user_id, p.username, COALESCE(s.week_points, 0) AS week_points
  FROM public.profiles p
  LEFT JOIN sums s ON s.user_id = p.user_id
  WHERE p.user_id IN (SELECT uid FROM friend_ids);
$$;