import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, FileText, X, Settings, Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useNotes } from '@/hooks/use-notes';
import { transcribeAudio, getOpenAIApiKey, hasOpenAIApiKeyAsync, saveOpenAIApiKey } from '@/lib/openai-service';
import { toast } from 'sonner';
import { VoiceWaveform } from './VoiceWaveform';

interface VoiceAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AssistantState = 'idle' | 'recording' | 'processing' | 'complete' | 'error' | 'no-api-key';

export function VoiceAssistantModal({ open, onOpenChange }: VoiceAssistantModalProps) {
  const navigate = useNavigate();
  const { createNote, canCreateNote } = useNotes();
  const [state, setState] = useState<AssistantState>('idle');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');

  const {
    recordingState,
    formattedDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  } = useVoiceRecording({
    onRecordingComplete: handleRecordingComplete,
    onError: (err) => {
      console.error('Recording error:', err);
      toast.error(err.message || 'Failed to record audio');
      setState('error');
      setError(err.message);
    },
  });

  // Check for API key when modal opens
  useEffect(() => {
    if (open) {
      // Check async for API key from database
      hasOpenAIApiKeyAsync().then((hasKey) => {
        if (!hasKey) {
          setState('no-api-key');
        } else {
          setState('idle');
        }
      });
    } else {
      // Reset when modal closes
      handleReset();
    }
  }, [open]);

  async function handleRecordingComplete(audioBlob: Blob) {
    setState('processing');

    try {
      const apiKey = await getOpenAIApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Transcribe audio
      const result = await transcribeAudio(audioBlob, apiKey);
      setTranscription(result.text);

      if (!result.text.trim()) {
        toast.error('No speech detected. Please try again.');
        setState('error');
        setError('No speech detected');
        return;
      }

      setState('complete');
      toast.success('Transcription complete!');

    } catch (err) {
      console.error('Transcription error:', err);
      let message = err instanceof Error ? err.message : 'Failed to transcribe audio';
      let detailedError = message;

      // Provide helpful error messages for common OpenAI errors
      if (message.includes('quota')) {
        detailedError = 'Your OpenAI API key has exceeded its quota. Please add credits to your OpenAI account or check your billing settings.';
      } else if (message.includes('invalid') || message.includes('Incorrect API key')) {
        detailedError = 'Invalid API key. Please check that you entered the correct OpenAI API key.';
      } else if (message.includes('rate limit')) {
        detailedError = 'Rate limit exceeded. Please wait a moment and try again.';
      }

      toast.error(detailedError, {
        duration: 6000,
      });
      setState('error');
      setError(detailedError);
    }
  }

  async function handleCreateNote() {
    if (!transcription.trim()) {
      toast.error('No transcription available');
      return;
    }

    if (!canCreateNote) {
      toast.error('Cannot create more notes. Please upgrade or delete some notes.');
      return;
    }

    try {
      // Create note with transcription
      const newNote = await createNote({
        title: 'Voice Note',
        content: {
          blocks: [
            {
              id: `block-${Date.now()}`,
              type: 'paragraph',
              content: transcription,
            },
          ],
        },
      });

      toast.success('Note created successfully!');
      onOpenChange(false);

      // Navigate to the new note
      navigate(`/notes?id=${newNote.id}`);
    } catch (err) {
      console.error('Failed to create note:', err);
      toast.error('Failed to create note');
    }
  }

  function handleStartRecording() {
    setTranscription('');
    setError('');
    startRecording();
    setState('recording');
  }

  function handleStopRecording() {
    stopRecording();
  }

  function handleCancel() {
    cancelRecording();
    handleReset();
  }

  function handleReset() {
    resetRecording();
    setTranscription('');
    setError('');
    // Check async for API key
    hasOpenAIApiKeyAsync().then((hasKey) => {
      setState(hasKey ? 'idle' : 'no-api-key');
    });
  }

  function handleClose() {
    if (recordingState === 'recording') {
      cancelRecording();
    }
    handleReset();
    onOpenChange(false);
  }

  async function handleSaveApiKey() {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast.error('Invalid API key format. OpenAI keys start with "sk-"');
      return;
    }

    const success = await saveOpenAIApiKey(apiKey.trim());
    if (success) {
      toast.success('API key saved to database successfully!');
    } else {
      // Check browser console for details
      toast.warning('Saved to browser only. Database migration pending.', {
        description: 'Your API key is saved locally. Check console (F12) for details.',
        duration: 6000,
      });
    }
    setApiKey('');
    setState('idle');
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Assistant
          </DialogTitle>
          <DialogDescription>
            Record your voice and create a note automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* No API Key State */}
          {state === 'no-api-key' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                  OpenAI API key is required for voice transcription.
                </p>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
                  Get your API key from:{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  OpenAI API Key
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveApiKey();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally in your browser and never sent to our servers.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveApiKey} className="flex-1">
                  <Key className="h-4 w-4 mr-2" />
                  Save API Key
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Idle State */}
          {state === 'idle' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                {/* Pulsating orb with gradient */}
                <div className="relative">
                  {/* Outer glow rings */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-2xl animate-pulse" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 opacity-30 blur-xl animate-ping" style={{ animationDuration: '3s' }} />

                  {/* Main orb */}
                  <div className="relative rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 p-12 shadow-2xl">
                    <Mic className="h-14 w-14 text-white drop-shadow-lg" />
                  </div>
                </div>

                {/* Ambient text */}
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    I'm listening...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tap to start speaking
                  </p>
                </div>
              </div>

              <Button
                onClick={handleStartRecording}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {/* Recording State */}
          {state === 'recording' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                {/* Animated waveform visualization */}
                <div className="w-full">
                  <VoiceWaveform isRecording={true} color="#a855f7" />
                </div>

                {/* Pulsating recording orb */}
                <div className="relative">
                  {/* Multiple pulsing rings for "alive" effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 to-pink-500 opacity-40 blur-2xl animate-pulse" style={{ animationDuration: '1.5s' }} />
                  <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-br from-red-400 to-pink-400 opacity-30 blur-xl animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-0 scale-125 rounded-full bg-gradient-to-br from-red-300 to-pink-300 opacity-20 blur-2xl animate-pulse" style={{ animationDuration: '2.5s' }} />

                  {/* Main recording orb */}
                  <div className="relative rounded-full bg-gradient-to-br from-red-500 via-pink-500 to-red-600 p-8 shadow-2xl">
                    <Mic className="h-10 w-10 text-white drop-shadow-lg animate-pulse" />
                  </div>
                </div>

                {/* Duration with breathing animation */}
                <div className="text-center space-y-2">
                  <p className="text-3xl font-mono font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
                    {formattedDuration}
                  </p>
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Listening to your voice...
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleStopRecording}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Recording
                </Button>
                <Button onClick={handleCancel} variant="outline" size="lg">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {/* Waveform continues in processing mode */}
              <div className="w-full">
                <VoiceWaveform isRecording={false} color="#a855f7" />
              </div>

              {/* Pulsating thinking orb */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 opacity-30 blur-2xl animate-pulse" />
                <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 opacity-20 blur-xl animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 p-8 shadow-2xl">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
                  Understanding your words...
                </p>
                <Progress value={undefined} className="w-full max-w-xs" />
              </div>
            </div>
          )}

          {/* Complete State */}
          {state === 'complete' && transcription && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Transcription:</p>
                <p className="text-sm">{transcription}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateNote} className="flex-1" size="lg">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
                <Button onClick={handleReset} variant="outline" size="lg">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive font-medium">Error</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
                {error.includes('quota') && (
                  <div className="mt-3 pt-3 border-t border-destructive/20">
                    <p className="text-xs text-destructive/70 mb-2">
                      To fix this:
                    </p>
                    <ul className="text-xs text-destructive/70 space-y-1 list-disc list-inside">
                      <li>
                        Visit{' '}
                        <a
                          href="https://platform.openai.com/settings/organization/billing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          OpenAI Billing
                        </a>
                        {' '}to add credits
                      </li>
                      <li>Check your usage at{' '}
                        <a
                          href="https://platform.openai.com/usage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          OpenAI Usage
                        </a>
                      </li>
                      <li>Minimum $5 credit recommended for testing</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReset} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleClose} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
