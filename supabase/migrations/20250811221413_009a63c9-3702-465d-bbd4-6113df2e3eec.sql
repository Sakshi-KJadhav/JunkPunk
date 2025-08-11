-- Remove all penalty entries from daily_entries
DELETE FROM public.daily_entries WHERE choice = 'penalty';

-- Recalculate points for all users who had entries
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT user_id FROM public.daily_entries
    LOOP
        PERFORM public.recalculate_profile_points(user_record.user_id);
    END LOOP;
END $$;