/**
 * Username Step for Onboarding
 * Let new users choose their username during setup
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, X, AtSign, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  useUsernameAvailability,
  validateUsername,
  generateUsernameSuggestions,
} from '@/hooks/use-username';
import { supabase } from '@/integrations/supabase/client';

interface UsernameStepProps {
  username: string;
  onUpdate: (username: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function UsernameStep({ username, onUpdate, onNext, onBack }: UsernameStepProps) {
  const [localUsername, setLocalUsername] = useState(username);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email?: string; fullName?: string }>({});

  const { data: availabilityData, isLoading: checkingAvailability } =
    useUsernameAvailability(localUsername);

  const validation = validateUsername(localUsername);
  const isAvailable = (availabilityData as { available: boolean } | undefined)?.available ?? false;
  const canProceed = validation.isValid && isAvailable;

  // Fetch user info and generate suggestions on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserInfo({
            email: profile.email,
            fullName: profile.full_name,
          });

          // Generate suggestions if no username set
          if (!localUsername) {
            setIsGeneratingSuggestions(true);
            generateUsernameSuggestions(profile.full_name, profile.email)
              .then((sugg) => {
                setSuggestions(sugg);
                if (sugg.length > 0) {
                  setLocalUsername(sugg[0]);
                }
              })
              .finally(() => setIsGeneratingSuggestions(false));
          }
        }
      }
    };

    fetchUserInfo();
  }, []);

  const handleNext = () => {
    if (canProceed) {
      onUpdate(localUsername);
      onNext();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocalUsername(suggestion);
  };

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
            <AtSign className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h3 className="text-2xl font-semibold">Choose Your Username</h3>
        <p className="text-muted-foreground">
          Your username lets teammates mention and find you easily
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <AtSign className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Get @mentioned</p>
            <p className="text-xs text-muted-foreground">
              Team members can tag you in notes and work orders
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Easy collaboration</p>
            <p className="text-xs text-muted-foreground">
              Share work orders and collaborate with your team
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
            value={localUsername}
            onChange={(e) => setLocalUsername(e.target.value.toLowerCase())}
            placeholder="your_username"
            className="pl-7"
            autoFocus
          />
          {localUsername.length >= 3 && (
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
        {localUsername && !validation.isValid && (
          <p className="text-sm text-destructive">{validation.error}</p>
        )}
        {localUsername && validation.isValid && !checkingAvailability && !isAvailable && (
          <p className="text-sm text-destructive">Username is already taken</p>
        )}
        {localUsername && validation.isValid && isAvailable && (
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
                  variant={localUsername === suggestion ? 'default' : 'outline'}
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

      {/* Note */}
      <Alert>
        <AlertDescription className="text-xs">
          You can change your username later in your profile settings if needed.
        </AlertDescription>
      </Alert>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
