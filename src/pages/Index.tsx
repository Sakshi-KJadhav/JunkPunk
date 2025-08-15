import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Apple, Carrot, CheckCircle, Target, TrendingUp } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-accent/30 to-success/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmOWY5ZmIiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="flex justify-center space-x-4 text-6xl mb-6">
                <Apple className="h-16 w-16 text-success animate-pulse" />
                <Carrot className="h-16 w-16 text-warning animate-pulse delay-75" />
                <Leaf className="h-16 w-16 text-primary animate-pulse delay-150" />
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6">
                JunkPunk
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Transform your eating habits with mindful tracking and positive reinforcement. 
                Every healthy choice counts towards a better you.
              </p>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Usernames are used for leaderboards and adding friends. You can choose yours after sign-in.
              </p>
            </div>
            
            <div className="space-y-6">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="text-lg px-8 py-4 bg-primary hover:bg-primary/90"
              >
                Start Your Journey
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Join thousands breaking free from junk food habits
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              How JunkPunk Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple daily tracking with powerful visual feedback to build lasting healthy habits
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <CardTitle>Daily Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Record your daily food choices with simple green (healthy) or red (junk food) selections. 
                  Build awareness through consistent tracking.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Target className="h-12 w-12 text-warning mx-auto mb-4" />
                <CardTitle>Points System</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Earn +10 points for healthy days, lose -10 for junk food days. 
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Visual Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  See your progress with color-coded calendar views. 
                  Green days show success, red shows areas for improvement.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-success/10">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
            Ready to Break Free from Junk Food?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start tracking today and watch as small daily choices transform into lasting healthy habits. 
            Your future self will thank you.
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="text-lg px-8 py-4"
          >
            Create Your Account
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
