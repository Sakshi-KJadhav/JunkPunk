import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Trophy, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { addDays, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DailyEntry {
  id: string;
  entry_date: string;
  choice: 'green' | 'red' | 'penalty';
  points: number;
  user_id: string;
  created_at: string;
}

interface Profile {
  total_points: number;
  username: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [profile, setProfile] = useState<Profile>({ total_points: 0, username: null });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [friendUsername, setFriendUsername] = useState('');
  const [friends, setFriends] = useState<{ user_id: string; username: string | null; total_points: number }[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; user_id: string; username: string | null }[]>([]);
  const [weeklyWinners, setWeeklyWinners] = useState<{ user_id: string; username: string | null; week_points: number }[]>([]);
  const [lastWeekRange, setLastWeekRange] = useState<{ start: string; end: string } | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const navigate = useNavigate();

  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    // Detect if the user arrived via a password recovery link and is in "recovery" state
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const type = hashParams.get('type') || queryParams.get('type');

    if (type === 'recovery') {
      setShowRecoveryPrompt(true);
      // Clean up URL so refreshes don't re-open the dialog
      if (window.history && window.location) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchProfile();
    }
  }, [user]);

  // penalties removed

  const fetchEntries = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      setEntries((data || []).map(entry => ({
        ...entry,
        choice: entry.choice as 'green' | 'red' | 'penalty'
      })));
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('total_points, username')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data || { total_points: 0, username: null });
    }
  };

  const fetchFriends = async () => {
    if (!user) return;
    // Get accepted friends' profiles plus self (two queries to avoid OR ambiguity)
    const [asRequester, asFriendOf] = await Promise.all([
      supabase
        .from('friendships')
        .select('user_id, friend_user_id, status')
        .eq('user_id', user.id)
        .eq('status', 'accepted'),
      supabase
        .from('friendships')
        .select('user_id, friend_user_id, status')
        .eq('friend_user_id', user.id)
        .eq('status', 'accepted'),
    ]);

    if (asRequester.error) {
      console.error('Error fetching friendships (requester):', asRequester.error);
      return;
    }
    if (asFriendOf.error) {
      console.error('Error fetching friendships (friend_of):', asFriendOf.error);
      return;
    }

    const acceptedFriendLinks = [
      ...(asRequester.data || []),
      ...(asFriendOf.data || []),
    ];

    const friendIds = new Set<string>();
    acceptedFriendLinks.forEach((l: any) => {
      friendIds.add(l.user_id === user.id ? l.friend_user_id : l.user_id);
    });
    friendIds.add(user.id);

    if (friendIds.size === 0) {
      setFriends([]);
      return;
    }

    const idsArray = Array.from(friendIds);
    const { data: profilesData, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, username, total_points')
      .in('user_id', idsArray);
    if (profErr) {
      console.error('Error fetching friend profiles:', profErr);
      return;
    }
    const sorted = (profilesData || []).sort((a, b) => b.total_points - a.total_points);
    setFriends(sorted as any);
  };

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    // Get pending friend requests sent TO this user
    const { data: requests, error } = await supabase
      .from('friendships')
      .select('id, user_id')
      .eq('friend_user_id', user.id)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Error fetching pending requests:', error);
      return;
    }
    
    if (!requests || requests.length === 0) {
      setPendingRequests([]);
      return;
    }
    
    // Get sender usernames separately
    const senderIds = requests.map(r => r.user_id);
    const { data: senderProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', senderIds);
    
    if (profileError) {
      console.error('Error fetching sender profiles:', profileError);
      return;
    }
    
    setPendingRequests(requests.map(req => ({
      id: req.id,
      user_id: req.user_id,
      username: senderProfiles?.find(p => p.user_id === req.user_id)?.username || null
    })));
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('friend_user_id', user.id)
      .select('id')
      .single();
    
    if (error || !data) {
      toast({ title: 'Failed to accept request', description: error?.message || 'No matching request found', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Friend request accepted!', variant: 'default' });
    await Promise.all([fetchPendingRequests(), fetchFriends()]);
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);
    
    if (error) {
      toast({ title: 'Failed to reject request', description: error.message, variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Friend request rejected', variant: 'default' });
    fetchPendingRequests();
  };

  const getLastCompletedWeekRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 Sun .. 6 Sat
    // Last Saturday (end of Sun-Sat week)
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const offsetToLastSaturday = (day + 1) % 7; // Sun->1, Mon->2, ..., Sat->0
    end.setDate(end.getDate() - offsetToLastSaturday);
    // Start is the Sunday before that Saturday
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd');
    return { start: toDateStr(start), end: toDateStr(end) };
  };

  const fetchWeeklyLeaderboard = async () => {
    if (!user) return;
    const range = getLastCompletedWeekRange();
    setLastWeekRange(range);
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
      week_start: range.start,
      week_end: range.end,
    });
    if (error) {
      console.error('Error fetching weekly leaderboard:', error);
      return;
    }
    const list = data || [];
    if (list.length === 0) {
      setWeeklyWinners([]);
      return;
    }
    const maxPoints = Math.max(...list.map((x: any) => x.week_points));
    const winners = list.filter((x: any) => x.week_points === maxPoints);
    setWeeklyWinners(winners);
  };

  useEffect(() => {
    if (!user) return;
    fetchWeeklyLeaderboard();
  }, [user]);

  useEffect(() => {
    if (!user || weeklyWinners.length === 0 || !lastWeekRange) return;
    // Celebrate on Saturdays for last week's winners, once per week per device
    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const storageKey = `celebrated_until_${lastWeekRange.end}`;
    const alreadyCelebrated = localStorage.getItem(storageKey) === '1';
    if (isSaturday && !alreadyCelebrated) {
      // Trigger confetti burst
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 250);
      setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }), 400);
      localStorage.setItem(storageKey, '1');
    }
  }, [user, weeklyWinners, lastWeekRange]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [user, entries, profile]);

  // Username prompt if not set
  useEffect(() => {
    if (!user) return;
    if (profile && !profile.username) {
      setShowUsernameDialog(true);
      if (!usernameInput) {
        const base = (user.email || '').split('@')[0] || 'user';
        setUsernameInput(sanitizeUsername(base));
      }
    }
  }, [user, profile]);

  const sanitizeUsername = (raw: string) => {
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    const trimmed = cleaned.substring(0, 30);
    return trimmed.length < 3 ? `${trimmed}123`.substring(0, 3) : trimmed;
  };

  const checkAvailability = async (name: string) => {
    if (!name) return false;
    const candidate = sanitizeUsername(name);
    const { data, error } = await supabase.rpc('is_username_available', { candidate });
    if (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
    return !!data;
  };

  const suggestUsernames = async () => {
    if (!user) return;
    setCheckingUsername(true);
    try {
      const baseRaw = (user.email || '').split('@')[0] || 'user';
      const base = sanitizeUsername(baseRaw);
      const adjectives = ['fit', 'clean', 'green', 'healthy', 'fresh', 'active', 'vital', 'zen', 'smart', 'bold'];
      const numbers = [ '', '1', '7', '10', '21', '42', '77', '99' ];
      const candidates = new Set<string>();
      candidates.add(base);
      adjectives.forEach(adj => candidates.add(`${adj}_${base}`));
      numbers.forEach(n => candidates.add(`${base}${n}`));
      adjectives.forEach(adj => numbers.forEach(n => candidates.add(`${adj}_${base}${n}`)));

      const uniqueCandidates = Array.from(candidates).slice(0, 40);
      const checks = await Promise.all(uniqueCandidates.map(c => checkAvailability(c)));
      const available = uniqueCandidates.filter((c, i) => checks[i]);
      setUsernameSuggestions(available.slice(0, 5));
      if (available.length > 0 && !usernameInput) {
        setUsernameInput(available[0]);
      }
    } finally {
      setCheckingUsername(false);
    }
  };

  const saveUsername = async () => {
    if (!user) return;
    const candidate = sanitizeUsername(usernameInput);
    if (candidate.length < 3) {
      toast({ title: 'Invalid username', description: 'Must be at least 3 characters', variant: 'destructive' });
      return;
    }
    setSavingUsername(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: candidate })
      .eq('user_id', user.id)
      .select('username')
      .single();
    setSavingUsername(false);
    if (error) {
      const msg = /unique/i.test(error.message) ? 'That username is taken' : error.message;
      toast({ title: 'Could not set username', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Username set!', description: `Welcome, ${candidate}` });
    setShowUsernameDialog(false);
    fetchProfile();
    fetchFriends();
    fetchWeeklyLeaderboard();
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !friendUsername) return;
    
    setLoading(true);
    
    try {
      // Find user by username using secure function
      const { data: candidates, error: findErr } = await supabase
        .rpc('search_user_by_username', { search_username: friendUsername });
      if (findErr) {
        toast({ title: 'Could not search users', description: findErr.message, variant: 'destructive' });
        return;
      }
      const target = candidates?.[0];
      if (!target) {
        toast({ title: 'No user found with that username', description: friendUsername });
        return;
      }
      if (target.user_id === user.id) {
        toast({ title: 'You cannot add yourself' });
        return;
      }
      
      // Check if users are already accepted friends
      const { data: acceptedFriendships, error: checkErr } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(user_id.eq.${user.id},friend_user_id.eq.${target.user_id}),and(user_id.eq.${target.user_id},friend_user_id.eq.${user.id})`);
      
      if (checkErr) {
        toast({ title: 'Could not check existing friendship', description: checkErr.message, variant: 'destructive' });
        return;
      }
      
      if (acceptedFriendships && acceptedFriendships.length > 0) {
        toast({ 
          title: 'Already friends', 
          description: 'You are already friends with this user',
          variant: 'destructive'
        });
        return;
      }
      
      // Delete any existing requests (both directions) first
      const { error: deleteErr } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_user_id.eq.${target.user_id}),and(user_id.eq.${target.user_id},friend_user_id.eq.${user.id})`);
      
      if (deleteErr) {
        console.error('Error deleting existing requests:', deleteErr);
      }
      
      // Create new friendship request
      const { error: insertErr } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_user_id: target.user_id, status: 'pending' });
      
      if (insertErr) {
        toast({ title: 'Failed to send request', description: insertErr.message, variant: 'destructive' });
        return;
      }

      toast({ 
        title: 'Friend request sent!', 
        description: `Request sent to ${target.username}. They will see it in their JunkPunk dashboard.`,
        variant: 'default'
      });

      setFriendUsername('');
      fetchPendingRequests();  // Refresh in case they sent us a request too
      
    } catch (error) {
      console.error('Error adding friend:', error);
      toast({ title: 'Failed to send friend request', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (choice: 'green' | 'red') => {
    if (!user) return;
    // Prevent logging for future dates
    const tomorrow = addDays(new Date(), 1);
    if (isAfter(selectedDate, tomorrow)) {
      toast({ title: 'Invalid date', description: 'You can only log up to today.', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const points = choice === 'green' ? 10 : -10;
    
    const { error } = await supabase
      .from('daily_entries')
      .upsert({
        user_id: user.id,
        entry_date: dateStr,
        choice,
        points
      });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive"
      });
    } else {
      // total_points is recalculated via DB trigger; just refetch
      
      toast({
        title: choice === 'green' ? "Great choice!" : "Tomorrow is a new day",
        description: `${points > 0 ? '+' : ''}${points} points`,
        variant: choice === 'green' ? "default" : "destructive"
      });
      
      fetchEntries();
      fetchProfile();
    }
    
    setLoading(false);
  };

  const getEntryForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.find(entry => entry.entry_date === dateStr);
  };

  const today = new Date();
  const selectedEntry = getEntryForDate(selectedDate);
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-success/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Post-recovery reset prompt */}
        <Dialog open={showRecoveryPrompt} onOpenChange={setShowRecoveryPrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset your password?</DialogTitle>
              <DialogDescription>
                You signed in using a recovery link. Would you like to set a new password now?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRecoveryPrompt(false)}>Not now</Button>
              <Button onClick={() => navigate('/reset-password')}>Reset password</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Username setup prompt */}
        <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose a username</DialogTitle>
              <DialogDescription>
                Pick a unique username to appear on leaderboards and for friends to find you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="your_username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(sanitizeUsername(e.target.value))}
                maxLength={30}
              />
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" onClick={suggestUsernames} disabled={checkingUsername}>
                  {checkingUsername ? 'Finding suggestions...' : 'Suggest' }
                </Button>
                {usernameSuggestions.map(s => (
                  <Button key={s} type="button" variant="secondary" onClick={() => setUsernameInput(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUsernameDialog(false)}>Later</Button>
              <Button onClick={saveUsername} disabled={savingUsername}>
                {savingUsername ? 'Saving...' : 'Save username'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">JunkPunk Dashboard</h1>
            <p className="text-muted-foreground">Track your healthy eating journey</p>
          </div>
          <div className="flex items-center gap-4">
            {profile.username && (
              <Badge variant="outline" className="text-lg px-4 py-2">
                @{profile.username}
              </Badge>
            )}
            <Badge variant="outline" className="text-lg px-4 py-2">
              {profile.total_points} points
            </Badge>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select a Date
              </CardTitle>
              <CardDescription>
                Choose a date to track your eating habits
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                toDate={new Date()}
                modifiers={{
                  green: entries
                    .filter(e => e.choice === 'green')
                    .map(e => new Date(e.entry_date)),
                  red: entries
                    .filter(e => e.choice === 'red')
                    .map(e => new Date(e.entry_date))
                }}
                modifiersStyles={{
                  green: { backgroundColor: 'hsl(var(--success))', color: 'white' },
                  red: { backgroundColor: 'hsl(var(--destructive))', color: 'white' }
                }}
              />
            </CardContent>
          </Card>

          {/* Daily Entry */}
          <Card>
            <CardHeader>
              <CardTitle>
                {format(selectedDate, 'MMMM d, yyyy')}
              </CardTitle>
              <CardDescription>
                {isToday ? "How did you do today?" : "How did you do on this day?"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedEntry && selectedEntry.choice !== 'penalty' ? (
                <div className="text-center space-y-4">
                  <div className={`p-4 rounded-lg ${
                    selectedEntry.choice === 'green' 
                      ? 'bg-success/10 text-success' 
                      : selectedEntry.choice === 'red'
                      ? 'bg-destructive/10 text-destructive'
                      : ''
                  }`}>
                    {selectedEntry.choice === 'green' && (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-6 w-6" />
                        <span className="font-semibold">No junk food! +10 points</span>
                      </div>
                    )}
                    {selectedEntry.choice === 'red' && (
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="h-6 w-6" />
                        <span className="font-semibold">Had junk food -10 points</span>
                      </div>
                    )}
                  </div>
                  {isToday && (
                    <p className="text-sm text-muted-foreground">
                      You can still update today's entry
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    No entry for this date
                  </p>
                </div>
              )}

              {(isToday || !selectedEntry || (selectedEntry && isToday)) && (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => updateEntry('green')}
                    disabled={loading}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    No Junk Food
                    <span className="ml-2 text-sm">+10</span>
                  </Button>
                  <Button
                    onClick={() => updateEntry('red')}
                    disabled={loading}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Had Junk Food
                    <span className="ml-2 text-sm">-10</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Friend Requests</CardTitle>
              <CardDescription>People who want to be your friend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between border rounded-md p-3">
                  <span className="truncate">{request.username ? `@${request.username}` : request.user_id}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id)}
                      className="bg-success hover:bg-success/90"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Friends & Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Friends Leaderboard</CardTitle>
            <CardDescription>Compete with friends by total points</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <Input
                type="text"
                placeholder="Friend's username"
                value={friendUsername}
                onChange={(e) => setFriendUsername(sanitizeUsername(e.target.value))}
                required
              />
              <Button type="submit" disabled={loading}>Add Friend</Button>
            </form>
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.user_id} className="flex justify-between items-center border rounded-md p-3">
                  <span className="truncate">{f.username ? `@${f.username}` : f.user_id}</span>
                  <Badge variant="outline">{f.total_points} pts</Badge>
                </div>
              ))}
              {friends.length === 0 && (
                <p className="text-sm text-muted-foreground">No friends yet. Add someone to start competing.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Winners */}
        {lastWeekRange && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Weekly Winners
              </CardTitle>
              <CardDescription>
                Last week: {format(new Date(lastWeekRange.start), 'MMM d')} - {format(new Date(lastWeekRange.end), 'MMM d')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {weeklyWinners.length > 0 ? (
                weeklyWinners.map((w) => (
                  <div key={w.user_id} className="flex justify-between items-center border rounded-md p-3 bg-accent/20">
                    <span className="truncate flex items-center gap-2">
                      <PartyPopper className="h-4 w-4 text-success" />
                      {w.username ? `@${w.username}` : w.user_id}
                    </span>
                    <Badge variant="outline">{w.week_points} pts</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No entries last week yet. Log your meals to compete!</p>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default Dashboard;