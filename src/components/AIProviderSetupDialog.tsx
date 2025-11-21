import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Sparkles, Key, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateUserPreferences } from '@/hooks/use-user-preferences';
import { useAuth } from '@/hooks/use-auth';

interface AIProviderSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (provider: 'lovable' | 'openai') => void;
}

export function AIProviderSetupDialog({ open, onOpenChange, onComplete }: AIProviderSetupDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<'lovable' | 'openai' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const updatePreferences = useUpdateUserPreferences();
  const { user } = useAuth();

  const handleSelectLovable = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await updatePreferences.mutateAsync({
        userId: user.id,
        aiProvider: 'lovable',
        aiProviderConfigured: true,
      });
      
      toast({
        title: 'Success',
        description: 'Lovable AI is ready to use!',
      });
      
      onComplete('lovable');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to configure AI provider',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOpenAI = async () => {
    if (!user) return;
    
    if (!apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your OpenAI API key',
        variant: 'destructive',
      });
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast({
        title: 'Invalid API Key',
        description: 'OpenAI API keys start with "sk-"',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      await updatePreferences.mutateAsync({
        userId: user.id,
        aiProvider: 'openai',
        aiProviderConfigured: true,
        openaiApiKey: apiKey,
      });
      
      toast({
        title: 'Success',
        description: 'OpenAI API key configured successfully!',
      });
      
      onComplete('openai');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save OpenAI API key',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose Your AI Transcription Provider</DialogTitle>
          <DialogDescription>
            Select how you want to transcribe voice recordings. You can change this anytime in Profile settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Lovable AI Option */}
          <Card className={`cursor-pointer transition-all ${selectedProvider === 'lovable' ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedProvider('lovable')}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Lovable AI (Built-in)</CardTitle>
              </div>
              <CardDescription>Quick setup, lower accuracy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Works immediately - no setup needed</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>No API key or OpenAI account required</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Included with your workspace</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Best-effort transcription (general AI model)</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Lower accuracy for technical terms & short phrases</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Uses workspace AI credits (request-based)</span>
                </div>
              </div>
              {selectedProvider === 'lovable' && (
                <Button 
                  className="w-full mt-4" 
                  onClick={handleSelectLovable}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Use Lovable AI'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* OpenAI Option */}
          <Card className={`cursor-pointer transition-all ${selectedProvider === 'openai' ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedProvider('openai')}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Your OpenAI API Key</CardTitle>
              </div>
              <CardDescription className="font-semibold">Recommended for accurate transcriptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="font-medium">Industry-leading Whisper model</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="font-medium">99%+ accuracy for clear audio</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Direct billing with OpenAI ($0.006/min)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>No Lovable rate limits</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Full cost transparency</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Requires OpenAI account setup</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>You manage API keys & billing</span>
                </div>
              </div>
              {selectedProvider === 'openai' && (
                <div className="space-y-3 mt-4">
                  <div>
                    <Label htmlFor="api-key">OpenAI API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your API key from{' '}
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        platform.openai.com
                      </a>
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSelectOpenAI}
                    disabled={loading || !apiKey.trim()}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save OpenAI Key'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
