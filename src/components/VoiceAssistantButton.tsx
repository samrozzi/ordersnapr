import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceAssistantModal } from './VoiceAssistantModal';
import { useAuth } from '@/hooks/use-auth';
import { useUserPreferences } from '@/hooks/use-user-preferences';

export function VoiceAssistantButton() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: userPreferences, isLoading } = useUserPreferences(user?.id || null);

  // Don't render until preferences are loaded
  if (isLoading || !user) {
    return null;
  }

  // Check if voice assistant is disabled by user
  if (userPreferences?.voice_assistant_enabled === false) {
    return null;
  }

  return (
    <>
      {/* Floating Button - positioned to the left of QuickAddButton */}
      <div className="fixed bottom-6 right-24 z-40">
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          variant="secondary"
          className="relative h-14 w-14 aspect-square p-0 rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 overflow-hidden group"
          title="Voice Assistant"
        >
          {/* Pulsating glow animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 animate-pulse blur-md transition-opacity duration-300" />

          {/* Subtle always-on pulse */}
          <div className="absolute inset-0 rounded-full bg-purple-300 opacity-20 animate-ping" style={{ animationDuration: '3s' }} />

          {/* Icon */}
          <MessageSquare className="h-6 w-6 relative z-10" />
        </Button>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal open={open} onOpenChange={setOpen} />
    </>
  );
}
