import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, Keyboard, Volume2, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { AssistantCharacter } from './AssistantCharacter';
import { AudioBlob } from './AudioBlob';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useNotes } from '@/hooks/use-notes';
import { transcribeAudio, hasOpenAIApiKeyAsync, getOpenAIApiKey } from '@/lib/openai-service';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { saveOpenAIApiKey } from '@/lib/openai-service';

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AssistantState = 'idle' | 'listening' | 'processing' | 'complete' | 'error' | 'no-api-key';
type InputMode = 'text' | 'voice';

export function VoiceAssistantDrawer({ open, onOpenChange }: VoiceAssistantDrawerProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<AssistantState>('idle');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textContent, setTextContent] = useState('');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  const { createNote } = useNotes();

  // Define recording complete handler before using it in the hook
  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    setState('processing');
    setInputMode('text');

    try {
      // Get API key
      const apiKey = await getOpenAIApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please configure it first.');
      }

      const result = await transcribeAudio(audioBlob, apiKey);
      setTranscription(result.text);
      setTextContent(result.text);
      setState('complete');
      toast.success('Transcription complete!');
    } catch (err) {
      console.error('Transcription error:', err);
      setState('error');
      setError(err instanceof Error ? err.message : 'Transcription failed');
      toast.error('Transcription failed', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    }
  }, []);

  const {
    recordingState,
    duration,
    formattedDuration,
    audioUrl,
    analyser,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    resetRecording,
  } = useVoiceRecording({
    onRecordingComplete: handleRecordingComplete,
    onError: (error: Error) => {
      console.error('Recording error:', error);
      setState('error');
      setError(error.message);
      toast.error('Recording failed', { description: error.message });
    },
  });

  useEffect(() => {
    if (open) {
      checkApiKey();
      resetState();
    }
  }, [open]);

  const checkApiKey = async () => {
    const hasKey = await hasOpenAIApiKeyAsync();
    setHasApiKey(hasKey);
    if (!hasKey) {
      setState('no-api-key');
    } else {
      setState('idle');
    }
  };

  const resetState = () => {
    setTextContent('');
    setTranscription('');
    setError('');
    setInputMode('text');
    resetRecording();
  };

  const handleStartRecording = () => {
    setInputMode('voice');
    setState('listening');
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleCreateNote = async () => {
    if (!textContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    try {
      await createNote({
        title: textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''),
        content: { 
          blocks: [
            {
              id: crypto.randomUUID(),
              type: 'paragraph',
              content: textContent
            }
          ]
        },
      });

      toast.success('Note created successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create note:', error);
      setState('error');
      setError('Failed to create note');
      toast.error('Failed to create note');
    }
  };

  const handleReset = () => {
    resetState();
    setState('idle');
  };

  const handleClose = () => {
    if (recordingState === 'recording') {
      cancelRecording();
    }
    resetState();
    onOpenChange(false);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    try {
      await saveOpenAIApiKey(apiKey);
      setHasApiKey(true);
      setState('idle');
      toast.success('API key saved successfully!');
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save API key');
    }
  };

  const getCharacterState = (): 'idle' | 'listening' | 'processing' | 'typing' | 'success' | 'error' | 'speaking' => {
    if (state === 'no-api-key') return 'idle';
    if (state === 'listening' || recordingState === 'recording') return 'listening';
    if (state === 'processing') return 'processing';
    if (state === 'complete') return 'success';
    if (state === 'error') return 'error';
    if (textContent.length > 0) return 'typing';
    return 'idle';
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[45vh] max-h-[600px] md:right-4 md:left-auto md:w-[450px] md:rounded-lg md:bottom-4">
        <DrawerHeader className="text-center pb-2">
          <AssistantCharacter state={getCharacterState()} isAnimating={true} />
          <DrawerTitle className="text-2xl mt-4">AI Assistant</DrawerTitle>
          <DrawerDescription>
            {state === 'no-api-key' && 'Configure your OpenAI API key to get started'}
            {state === 'idle' && 'Type your thoughts or speak them aloud'}
            {state === 'listening' && `Recording... ${formattedDuration}`}
            {state === 'processing' && 'Transcribing your voice...'}
            {state === 'complete' && 'Ready to create your note!'}
            {state === 'error' && 'Oops! Something went wrong'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 px-4 overflow-y-auto">
          {state === 'no-api-key' ? (
            <div className="space-y-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground text-center">
                You'll need an OpenAI API key to use voice transcription.
              </p>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={handleSaveApiKey} className="w-full">
                Save API Key
              </Button>
            </div>
          ) : state === 'error' ? (
            <div className="text-center space-y-4">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Voice Recording Visualization */}
              {inputMode === 'voice' && recordingState === 'recording' && analyser && (
                <div className="flex justify-center">
                  <AudioBlob analyser={analyser} isActive={true} size={120} />
                </div>
              )}

              {/* Text Input Area */}
              <div className="relative">
                <Textarea
                  placeholder="Type or speak your thoughts..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="min-h-[120px] pr-12 resize-none"
                  disabled={state === 'processing'}
                />
                
                {/* Voice Button Overlay */}
                <div className="absolute bottom-3 right-3 flex gap-1">
                  {inputMode === 'text' ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleStartRecording}
                      disabled={state === 'processing'}
                      className="h-8 w-8 hover:bg-primary/10"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      {/* Stop button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleStopRecording}
                        className="h-8 w-8 hover:bg-destructive/10"
                      >
                        <Square className="h-4 w-4 text-destructive" />
                      </Button>
                      
                      {/* Pause/Resume button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (recordingState === 'recording') {
                            pauseRecording();
                          } else if (recordingState === 'paused') {
                            resumeRecording();
                          }
                        }}
                        className={cn(
                          "h-8 w-8",
                          recordingState === 'recording' && "animate-pulse"
                        )}
                      >
                        {recordingState === 'paused' ? (
                          <Mic className="h-4 w-4 text-primary" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Recording status */}
              {recordingState === 'recording' && (
                <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  Recording: {formattedDuration}
                </p>
              )}
              
              {recordingState === 'paused' && (
                <p className="text-sm text-center text-muted-foreground">
                  ⏸ Paused: {formattedDuration}
                </p>
              )}
              
              {/* Character count */}
              {textContent.length > 0 && !recordingState && (
                <p className="text-xs text-muted-foreground text-right">
                  {textContent.length} characters
                </p>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="pt-2">
          {state === 'no-api-key' ? (
            <Button variant="outline" onClick={handleClose} className="w-full">
              Close
            </Button>
          ) : state === 'complete' || textContent.length > 0 ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Clear
              </Button>
              <Button 
                onClick={handleCreateNote} 
                className="flex-1"
                disabled={!textContent.trim()}
              >
                Create Note
              </Button>
            </div>
          ) : state === 'error' ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Try Again
              </Button>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
