import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Recovery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const { accessToken, refreshToken } = useMemo(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    return {
      accessToken: hashParams.get('access_token') || queryParams.get('access_token') || null,
      refreshToken: hashParams.get('refresh_token') || queryParams.get('refresh_token') || null,
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      toast({
        title: 'Invalid recovery link',
        description: 'Please request a new password reset email.',
        variant: 'destructive',
      });
    }
  }, [accessToken, refreshToken, toast]);

  const establishSession = async (): Promise<boolean> => {
    try {
      if (!accessToken || !refreshToken) return false;
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        toast({ title: 'Could not establish session', description: error.message, variant: 'destructive' });
        return false;
      }
      return true;
    } catch (e) {
      toast({ title: 'Could not establish session', variant: 'destructive' });
      return false;
    }
  };

  const handleResetNow = async () => {
    setIsProcessing(true);
    const ok = await establishSession();
    setIsProcessing(false);
    if (ok) navigate('/reset-password');
  };

  const handleContinue = async () => {
    setIsProcessing(true);
    const ok = await establishSession();
    setIsProcessing(false);
    if (ok) navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-success/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Continue your recovery</CardTitle>
            <CardDescription>
              Choose whether to reset your password now or continue to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={handleResetNow} disabled={isProcessing || !accessToken || !refreshToken}>
                Reset password now
              </Button>
              <Button variant="outline" onClick={handleContinue} disabled={isProcessing || !accessToken || !refreshToken}>
                Continue to app
              </Button>
            </div>
            <div className="text-center">
              <Button variant="link" onClick={handleCancel} className="text-sm text-muted-foreground hover:text-primary">
                Cancel and go back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Recovery;