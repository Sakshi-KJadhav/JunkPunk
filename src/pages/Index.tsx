import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Apple, Carrot, CheckCircle, Target, TrendingUp, Sparkles, Heart, Zap } from 'lucide-react';

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
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmOWY5ZmIiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 animate-bounce-gentle">
          <Sparkles className="h-8 w-8 text-yellow-400" />
        </div>
        <div className="absolute top-32 right-20 animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>
          <Heart className="h-6 w-6 text-pink-400" />
        </div>
        <div className="absolute bottom-32 left-20 animate-bounce-gentle" style={{ animationDelay: '1s' }}>
          <Zap className="h-7 w-7 text-blue-400" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="flex justify-center space-x-6 text-6xl mb-6">
                <div className="animate-bounce-gentle">
                  <Apple className="h-20 w-20 text-red-500 hover:animate-wiggle cursor-pointer" />
                </div>
                <div className="animate-bounce-gentle" style={{ animationDelay: '0.3s' }}>
                  <Carrot className="h-20 w-20 text-orange-500 hover:animate-wiggle cursor-pointer" />
                </div>
                <div className="animate-bounce-gentle" style={{ animationDelay: '0.6s' }}>
                  <Leaf className="h-20 w-20 text-green-500 hover:animate-wiggle cursor-pointer" />
                </div>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-bold gradient-text mb-6 animate-pulse-glow">
                JunkPunk
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium">
                🌟 Transform your eating habits with mindful tracking and positive reinforcement! 
                Every healthy choice counts towards a better you. 🚀
              </p>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto bg-white/50 rounded-full px-4 py-2 backdrop-blur-sm">
                ✨ Usernames are used for leaderboards and adding friends. You can choose yours after sign-in! ✨
              </p>
            </div>
            
            <div className="space-y-6">
              <Button 
                size="lg"
                onClick={handleGetStarted}
                className="text-xl px-12 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse-glow"
              >
                🎉 Start Your Journey 🎉
              </Button>
              
              <p className="text-lg text-gray-600 font-semibold">
                🎊 Join thousands breaking free from junk food habits! 🎊
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              🎮 How JunkPunk Works 🎮
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
              🌈 Simple daily tracking with powerful visual feedback to build lasting healthy habits! 🌈
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center card-hover bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-200">
              <CardHeader>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce-gentle" />
                <CardTitle className="text-2xl font-bold text-green-700">📅 Daily Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-gray-700 font-medium">
                  🥗 Record your daily food choices with simple green (healthy) or red (junk food) selections. 
                  Build awareness through consistent tracking! ✨
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center card-hover bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-200">
              <CardHeader>
                <Target className="h-16 w-16 text-orange-500 mx-auto mb-4 animate-bounce-gentle" style={{ animationDelay: '0.3s' }} />
                <CardTitle className="text-2xl font-bold text-orange-700">🎯 Points System</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-gray-700 font-medium">
                  🏆 Earn +10 points for healthy days, lose -10 for junk food days. 
                  Level up your health game! 🎮
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center card-hover bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-200">
              <CardHeader>
                <TrendingUp className="h-16 w-16 text-purple-500 mx-auto mb-4 animate-bounce-gentle" style={{ animationDelay: '0.6s' }} />
                <CardTitle className="text-2xl font-bold text-purple-700">📊 Visual Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-gray-700 font-medium">
                  🌈 See your progress with color-coded calendar views. 
                  Green days show success, red shows areas for improvement! 📈
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-8">
            🚀 Ready to Break Free from Junk Food? 🚀
          </h2>
          <p className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto font-medium">
            ✨ Start tracking today and watch as small daily choices transform into lasting healthy habits. 
            Your future self will thank you! 🙏
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="text-xl px-12 py-6 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            🎉 Create Your Account 🎉
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
