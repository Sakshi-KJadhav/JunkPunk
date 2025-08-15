import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (!error) {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const sanitizeUsername = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signUp(email, password);
    // Best-effort set username if provided
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;
      const candidate = sanitizeUsername(username);
      if (authUser && candidate && candidate.length >= 3) {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ username: candidate })
          .eq('user_id', authUser.id);
        if (updErr) {
          // Ignore error here; Dashboard will prompt
          console.warn('Could not set username during sign up:', updErr.message);
        }
      }
    } catch {}
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`
    });

    if (error) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Reset link sent!",
        description: "Check your email for a password reset link."
      });
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-success/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 
            className="text-4xl font-bold text-primary mb-2 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate('/')}
          >
            JunkPunk
          </h1>
          <p className="text-muted-foreground">Your healthy eating companion</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Start your journey to healthier eating habits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <div className="text-center mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Create a password"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-username">Username (optional)</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                      placeholder="your_username"
                      maxLength={30}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;