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
import { Sparkles, Heart, Star } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 animate-bounce-gentle">
        <Sparkles className="h-8 w-8 text-yellow-400" />
      </div>
      <div className="absolute top-32 right-20 animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>
        <Heart className="h-6 w-6 text-pink-400" />
      </div>
      <div className="absolute bottom-32 left-20 animate-bounce-gentle" style={{ animationDelay: '1s' }}>
        <Star className="h-7 w-7 text-blue-400" />
      </div>
      
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 
            className="text-5xl font-bold gradient-text mb-4 cursor-pointer hover:scale-105 transition-transform duration-300 animate-pulse-glow" 
            onClick={() => navigate('/')}
          >
            JunkPunk
          </h1>
          <p className="text-gray-600 text-lg font-medium">🌟 Your healthy eating companion! 🌟</p>
        </div>
        
        <Card className="shadow-2xl card-hover bg-gradient-to-br from-white to-purple-50 border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-purple-700 text-center">
              🎉 Welcome! 🎉
            </CardTitle>
            <CardDescription>
              ✨ Start your journey to healthier eating habits! ✨
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-purple-100 to-pink-100">
                <TabsTrigger value="signin" className="font-bold">🔑 Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="font-bold">🆕 Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email" className="font-semibold text-gray-700">📧 Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="✨ Enter your email"
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password" className="font-semibold text-gray-700">🔒 Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="🔐 Enter your password"
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    {loading ? '⏳ Signing in...' : '🚀 Sign In'}
                  </Button>
                  <div className="text-center mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-sm text-gray-600 hover:text-purple-600 font-medium"
                    >
                      {resetLoading ? '📧 Sending reset link...' : '🤔 Forgot password?'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email" className="font-semibold text-gray-700">📧 Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="✨ Enter your email"
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password" className="font-semibold text-gray-700">🔒 Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="🔐 Create a password"
                      minLength={6}
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-username" className="font-semibold text-gray-700">👤 Username (optional)</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                      placeholder="🎮 your_username"
                      maxLength={30}
                      className="border-purple-300 focus:border-purple-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    {loading ? '⏳ Creating account...' : '🎉 Create Account'}
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