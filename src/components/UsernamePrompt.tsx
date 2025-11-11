/**
 * Username Prompt Modal
 * Non-optional prompt for existing users to set their username
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, AtSign, Users, Share2, Bell } from 'lucide-react';
import {
  useSetUsername,
  useUsernameAvailability,
  validateUsername,
  generateUsernameSuggestions,
} from '@/hooks/use-username';
import { useToast } from '@/hooks/use-toast';

interface UsernamePromptProps {
  open: boolean;
  userEmail?: string;
  userFullName?: string;
}

export function UsernamePrompt({ open, userEmail, userFullName }: UsernamePromptProps) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const setUsernameMutation = useSetUsername();
  const { data: availabilityData, isLoading: checkingAvailability } = useUsernameAvailability(username);

  const validation = validateUsername(username);
  const isAvailable = (availabilityData as { available: boolean } | undefined)?.available ?? false;
  const canSubmit = validation.isValid && isAvailable && !setUsernameMutation.isPending;

  // Generate suggestions on mount
  useEffect(() => {
    if (open && suggestions.length === 0) {
      setIsGeneratingSuggestions(true);
      generateUsernameSuggestions(userFullName, userEmail)
        .then((sugg) => {
          setSuggestions(sugg);
          if (sugg.length > 0 && !username) {
            setUsername(sugg[0]);
          }
        })
        .finally(() => setIsGeneratingSuggestions(false));
    }
  }, [open, userFullName, userEmail]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const result = await setUsernameMutation.mutateAsync(username);

    if (result.success) {
      toast({
        title: 'Username Set!',
        description: `Your username @${username} has been set successfully.`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to set username',
        variant: 'destructive',
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent
        className="max-w-2xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Username</DialogTitle>
          <DialogDescription>
            Set up your unique username to unlock collaboration features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefits Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <AtSign className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Get @mentioned</p>
                <p className="text-xs text-muted-foreground">
                  Team members can tag you in notes and work orders
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Easy identification</p>
                <p className="text-xs text-muted-foreground">
                  Colleagues can find you quickly with your username
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Share2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Share & collaborate</p>
                <p className="text-xs text-muted-foreground">
                  Share work orders, invoices, and more with teammates
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Stay notified</p>
                <p className="text-xs text-muted-foreground">
                  Get notifications when someone mentions you
                </p>
              </div>
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="your_username"
                className="pl-7"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) {
                    handleSubmit();
                  }
                }}
              />
              {username.length >= 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingAvailability ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : validation.isValid && isAvailable ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </div>
              )}
            </div>

            {/* Validation Messages */}
            {username && !validation.isValid && (
              <p className="text-sm text-destructive">{validation.error}</p>
            )}
            {username && validation.isValid && !checkingAvailability && !isAvailable && (
              <p className="text-sm text-destructive">Username is already taken</p>
            )}
            {username && validation.isValid && isAvailable && (
              <p className="text-sm text-green-600">Username is available!</p>
            )}
          </div>

          {/* Requirements */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Username requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>3-30 characters long</li>
              <li>Must start with a letter or number</li>
              <li>Can contain letters, numbers, underscores, and hyphens</li>
              <li>Must be unique</li>
            </ul>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Suggestions</Label>
              <div className="flex flex-wrap gap-2">
                {isGeneratingSuggestions ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating suggestions...
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="h-auto py-1.5"
                    >
                      @{suggestion}
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Note about changing username */}
          <Alert>
            <AlertDescription className="text-xs">
              You can change your username later in your profile settings if needed.
            </AlertDescription>
          </Alert>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="min-w-32"
          >
            {setUsernameMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting...
              </>
            ) : (
              'Set Username'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
