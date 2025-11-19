import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, Keyboard, Volume2, Pause, Square, X } from 'lucide-react';
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
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { Label } from '@/components/ui/label';

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
  const [isTextMode, setIsTextMode] = useState(false);

  const { createNote } = useNotes();
  const keyboardHeight = useKeyboardHeight();
  const isKeyboardOpen = keyboardHeight > 0;

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
      
      // Append to existing text instead of replacing
      const newText = textContent 
        ? `${textContent}\n\n${result.text}` 
        : result.text;
      setTextContent(newText);
      
      setState('complete');
      setIsTextMode(true);
      toast.success('Transcription complete!');
    } catch (err) {
      console.error('Transcription error:', err);
      setState('error');
      setError(err instanceof Error ? err.message : 'Transcription failed');
      toast.error('Transcription failed', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    }
  }, [textContent]);

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
      const init = async () => {
        await checkApiKey();
        resetState();
        
        // Auto-start recording after a short delay if API key exists
        const hasKey = await hasOpenAIApiKeyAsync();
        if (hasKey) {
          setTimeout(() => {
            handleStartRecording();
          }, 400);
        }
      };
      init();
    } else {
      // Clean up when drawer closes
      if (recordingState === 'recording' || recordingState === 'paused') {
        cancelRecording();
      }
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
    setState('idle');
    setInputMode('voice');
    setTextContent('');
    setTranscription('');
    setError('');
    setIsTextMode(false);
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
    if (recordingState === 'recording' || recordingState === 'paused') {
      cancelRecording();
    }
    resetState();
    onOpenChange(false);
  };

  const handleTypeInstead = () => {
    pauseRecording();
    setIsTextMode(true);
    toast.info('Switched to text mode', {
      description: 'Tap the mic icon to resume recording',
    });
  };

  const handleResumeRecording = () => {
    setIsTextMode(false);
    resumeRecording();
    toast.info('Recording resumed', {
      description: 'Continue speaking...',
    });
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

  const getCharacterState = (): 'idle' | 'listening' | 'processing' | 'typing' | 'success' | 'error' | 'speaking' | 'paused' => {
    if (state === 'no-api-key') return 'idle';
    if (recordingState === 'paused' && !isTextMode) return 'paused';
    if (isTextMode && recordingState === 'paused') return 'idle'; // Show idle when in text mode
    if (state === 'listening' || recordingState === 'recording') return 'listening';
    if (state === 'processing') return 'processing';
    if (state === 'complete') return 'success';
    if (state === 'error') return 'error';
    if (textContent.length > 0) return 'typing';
    return 'idle';
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[50vh] max-h-[600px] md:right-4 md:left-auto md:w-[450px] md:rounded-lg md:bottom-4 pb-safe">
        <DrawerHeader className="text-center pb-2">
          <div className="flex flex-col items-center gap-3">
            <AssistantCharacter state={getCharacterState()} isAnimating={true} />
            
            {/* Recording controls - shown only when recording or paused */}
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant={recordingState === 'paused' ? 'default' : 'outline'}
                  onClick={() => {
                    if (recordingState === 'recording') {
                      pauseRecording();
                    } else if (recordingState === 'paused') {
                      resumeRecording();
                    }
                  }}
                  className={cn(
                    "h-12 w-12 rounded-full",
                    recordingState === 'recording' && "animate-pulse"
                  )}
                >
                  {recordingState === 'paused' ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <Pause className="h-5 w-5" />
                  )}
                </Button>
                
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={handleStopRecording}
                  className="h-12 w-12 rounded-full"
                >
                  <Square className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
          
          <DrawerTitle className="text-2xl mt-4">AI Assistant</DrawerTitle>
          <DrawerDescription>
            {state === 'no-api-key' && 'Configure your OpenAI API key to get started'}
            {state === 'idle' && recordingState === 'idle' && 'Ready to listen!'}
            {recordingState === 'recording' && `Recording... ${formattedDuration}`}
            {recordingState === 'paused' && `Paused at ${formattedDuration}`}
            {state === 'processing' && 'Transcribing your voice...'}
            {state === 'complete' && 'Transcription complete! Edit or create your note'}
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
              {/* "Type Instead" button during recording */}
              {(recordingState === 'recording' || recordingState === 'paused') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    cancelRecording();
                    setState('idle');
                  }}
                  className="w-full"
                >
                  <Keyboard className="h-4 w-4 mr-2" />
                  Type Instead
                </Button>
              )}

              {/* Text Input Area - only show when not actively recording */}
              {recordingState === 'idle' && (
                <div className="relative">
                  <Textarea
                    placeholder="Type or tap the mic to speak..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="min-h-[120px] pr-12 resize-none"
                    disabled={state === 'processing'}
                  />
                  
                  {/* Voice Button Overlay */}
                  <div className="absolute bottom-3 right-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleStartRecording}
                      disabled={state === 'processing'}
                      className="h-8 w-8 hover:bg-primary/10"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Character count */}
              {textContent.length > 0 && recordingState === 'idle' && (
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
