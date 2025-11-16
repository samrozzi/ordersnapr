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
import { AudioBlob } from './AudioBlob';

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
    analyser,
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
      <DialogContent className="sm:max-w-lg rounded-3xl border-2 border-purple-500/20 bg-gradient-to-br from-background via-background to-purple-500/5 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Voice Assistant</DialogTitle>
          <DialogDescription>
            Record your voice and create a note automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                {/* Simple pulsating mic */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl animate-pulse" />
                  <div className="relative rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-10 shadow-lg">
                    <Mic className="h-12 w-12 text-white" />
                  </div>
                </div>

                {/* Simple text */}
                <p className="text-sm text-muted-foreground">
                  Ready to listen
                </p>
              </div>

              <Button
                onClick={handleStartRecording}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl"
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
              <div className="flex flex-col items-center justify-center space-y-8">
                {/* Audio-reactive blob */}
                <AudioBlob analyser={analyser} isActive={true} color="#ec4899" size={250} />

                {/* Timer */}
                <p className="text-2xl font-mono font-semibold">{formattedDuration}</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleStopRecording}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-2xl"
                  size="lg"
                >
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Listening
                </Button>
                <Button onClick={handleCancel} variant="outline" size="lg" className="rounded-2xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-8">
              {/* Calm blob with spinner overlay */}
              <div className="relative">
                <AudioBlob analyser={null} isActive={false} color="#a855f7" size={200} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-purple-500/20 backdrop-blur-sm p-4">
                    <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                  </div>
                </div>
              </div>

              {/* Text and progress */}
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">Transcribing...</p>
                <Progress value={undefined} className="w-64" />
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
