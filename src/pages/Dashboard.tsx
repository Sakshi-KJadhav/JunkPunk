import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';

interface DailyEntry {
  id: string;
  entry_date: string;
  choice: 'green' | 'red' | 'penalty';
  points: number;
}

interface Profile {
  total_points: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [profile, setProfile] = useState<Profile>({ total_points: 0 });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchProfile();
    }
  }, [user]);

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
      setEntries(data || []);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data || { total_points: 0 });
    }
  };

  const updateEntry = async (choice: 'green' | 'red') => {
    if (!user) return;
    
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
      // Update total points
      await supabase.rpc('increment_points', {
        user_id_param: user.id,
        points_to_add: points
      });
      
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">JunkPunk Dashboard</h1>
            <p className="text-muted-foreground">Track your healthy eating journey</p>
          </div>
          <div className="flex items-center gap-4">
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
                modifiers={{
                  green: entries
                    .filter(e => e.choice === 'green')
                    .map(e => new Date(e.entry_date)),
                  red: entries
                    .filter(e => e.choice === 'red')
                    .map(e => new Date(e.entry_date)),
                  penalty: entries
                    .filter(e => e.choice === 'penalty')
                    .map(e => new Date(e.entry_date))
                }}
                modifiersStyles={{
                  green: { backgroundColor: 'hsl(var(--success))', color: 'white' },
                  red: { backgroundColor: 'hsl(var(--destructive))', color: 'white' },
                  penalty: { backgroundColor: 'hsl(var(--warning))', color: 'white' }
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
              {selectedEntry ? (
                <div className="text-center space-y-4">
                  <div className={`p-4 rounded-lg ${
                    selectedEntry.choice === 'green' 
                      ? 'bg-success/10 text-success' 
                      : selectedEntry.choice === 'red'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-warning/10 text-warning'
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
                    {selectedEntry.choice === 'penalty' && (
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="h-6 w-6" />
                        <span className="font-semibold">No entry penalty -20 points</span>
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
      </div>
    </div>
  );
};

export default Dashboard;