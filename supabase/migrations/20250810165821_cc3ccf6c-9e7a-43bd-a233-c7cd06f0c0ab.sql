-- Update RLS policy for profiles to allow users to search by email
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows users to search profiles by email (for friend functionality)
CREATE POLICY "Users can view profiles for friend search" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Keep existing policies for insert and update
-- Users can still only modify their own profile