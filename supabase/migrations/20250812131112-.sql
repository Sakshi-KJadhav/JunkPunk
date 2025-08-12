-- Drop the overly permissive RLS policy on profiles table
DROP POLICY IF EXISTS "Users can view profiles for friend search" ON public.profiles;

-- Create a more secure policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a more secure policy for viewing friend profiles (only if they are friends)
CREATE POLICY "Users can view friend profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'accepted' 
    AND (
      (user_id = auth.uid() AND friend_user_id = profiles.user_id) OR
      (user_id = profiles.user_id AND friend_user_id = auth.uid())
    )
  )
);

-- Create a secure function to search for users by email for friend requests
CREATE OR REPLACE FUNCTION public.search_user_by_email(search_email text)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only return user_id and email (no other sensitive data)
  -- This allows friend search without exposing all user data
  RETURN QUERY
  SELECT p.user_id, p.email
  FROM public.profiles p
  WHERE p.email ILIKE search_email
  LIMIT 1;
END;
$$;