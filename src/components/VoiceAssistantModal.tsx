import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, FileText, X, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useNotes } from '@/hooks/use-notes';
import { transcribeAudio, getOpenAIApiKey, hasOpenAIApiKey } from '@/lib/openai-service';
import { toast } from 'sonner';

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
      if (!hasOpenAIApiKey()) {
        setState('no-api-key');
      } else {
        setState('idle');
      }
    } else {
      // Reset when modal closes
      handleReset();
    }
  }, [open]);

  async function handleRecordingComplete(audioBlob: Blob) {
    setState('processing');

    try {
      const apiKey = getOpenAIApiKey();
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
      const message = err instanceof Error ? err.message : 'Failed to transcribe audio';
      toast.error(message);
      setState('error');
      setError(message);
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
    setState(hasOpenAIApiKey() ? 'idle' : 'no-api-key');
  }

  function handleClose() {
    if (recordingState === 'recording') {
      cancelRecording();
    }
    handleReset();
    onOpenChange(false);
  }

  function openSettings() {
    onOpenChange(false);
    navigate('/settings');
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
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  OpenAI API key is not configured. Please add your API key in settings to use voice transcription.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={openSettings} className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Open Settings
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Idle State */}
          {state === 'idle' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="rounded-full bg-primary/10 p-8">
                  <Mic className="h-12 w-12 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Click the button below to start recording
                </p>
              </div>
              <Button onClick={handleStartRecording} className="w-full" size="lg">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {/* Recording State */}
          {state === 'recording' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                  <div className="relative rounded-full bg-red-500 p-8">
                    <Mic className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-2xl font-mono font-semibold">{formattedDuration}</p>
                  <p className="text-sm text-muted-foreground">Recording...</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStopRecording} className="flex-1" size="lg">
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
                <Button onClick={handleCancel} variant="outline" size="lg">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Transcribing your voice...</p>
              <Progress value={undefined} className="w-full" />
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
