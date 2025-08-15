-- Create RPC to get weekly leaderboard (self + accepted friends only)
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(
  week_start DATE,
  week_end DATE
)
RETURNS TABLE(user_id UUID, email TEXT, week_points INTEGER) 
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
  SELECT p.user_id, p.email, COALESCE(s.week_points, 0) AS week_points
  FROM public.profiles p
  LEFT JOIN sums s ON s.user_id = p.user_id
  WHERE p.user_id IN (SELECT uid FROM friend_ids);
$$;