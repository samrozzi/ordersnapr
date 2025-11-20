import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Loader2, Keyboard, Pause, Square, X } from 'lucide-react';
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
import { AIActionsMenu } from './AIActionsMenu';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useNotes } from '@/hooks/use-notes';
import { transcribeAudio } from '@/lib/openai-service';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { saveOpenAIApiKey } from '@/lib/openai-service';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AssistantState = 'idle' | 'listening' | 'processing' | 'complete' | 'error' | 'no-api-key';
type InputMode = 'text' | 'voice';

export function VoiceAssistantDrawer({ open, onOpenChange }: VoiceAssistantDrawerProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<AssistantState>('idle');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
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

    try {
      // Try to get API key from database first
      const { data: { user } } = await supabase.auth.getUser();
      let apiKey: string | null = null;
      
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('openai_api_key')
          .eq('user_id', user.id)
          .maybeSingle();
        
        apiKey = data?.openai_api_key || null;
      }
      
      // Fallback to localStorage
      if (!apiKey) {
        const storedApiKey = localStorage.getItem('openai_api_key');
        if (storedApiKey && storedApiKey !== '""' && storedApiKey !== 'null') {
          // Remove quotes if present
          apiKey = storedApiKey.startsWith('"') ? JSON.parse(storedApiKey) : storedApiKey;
        }
      }
      
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please configure it in settings.');
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
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
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
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  } = useVoiceRecording({
    onRecordingComplete: handleRecordingComplete,
    onError: (error) => {
      console.error('Recording error:', error);
      setState('error');
      setError(error.message);
      toast.error('Recording failed', {
        description: error.message,
      });
    },
  });

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // Try to get from database first
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('user_preferences')
            .select('openai_api_key')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data?.openai_api_key) {
            setHasApiKey(true);
            setState('idle');
            return;
          }
        }
        
        // Fallback to localStorage
        const storedApiKey = localStorage.getItem('openai_api_key');
        if (storedApiKey && storedApiKey !== '""' && storedApiKey !== 'null') {
          setHasApiKey(true);
          setState('idle');
        } else {
          setHasApiKey(false);
          setState('no-api-key');
        }
      } catch (error) {
        console.error('Error checking API key:', error);
        setHasApiKey(false);
        setState('no-api-key');
      }
    };

    if (open) {
      checkApiKey();
    }
  }, [open]);

  // Auto-start recording when drawer opens (if API key exists)
  useEffect(() => {
    if (open && hasApiKey && recordingState === 'idle' && state !== 'no-api-key' && !isTextMode) {
      const timer = setTimeout(() => {
        handleStartRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, hasApiKey, recordingState, state, isTextMode]);

  const resetState = () => {
    setState('idle');
    setInputMode('voice');
    setTextContent('');
    setTranscription('');
    setError('');
    setIsTextMode(false);
  };

  const handleStartRecording = () => {
    setError('');
    setIsTextMode(false);
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
    // Set text mode FIRST so user can type immediately
    setIsTextMode(true);
    // Stop current recording and transcribe in background
    if (recordingState === 'recording') {
      stopRecording(); // This will trigger transcription and append to text
    }
  };

  const handleResumeRecording = () => {
    setIsTextMode(false);
    if (recordingState === 'idle') {
      handleStartRecording();
    } else if (recordingState === 'paused') {
      resumeRecording();
    }
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
    if (recordingState === 'paused') return 'paused';
    if (isTextMode || textContent.length > 0) return 'typing';
    if (state === 'listening' || recordingState === 'recording') return 'listening';
    if (state === 'processing') return 'processing';
    if (state === 'complete') return 'success';
    if (state === 'error') return 'error';
    return 'idle';
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={false}>
      <DrawerContent className="h-[50vh] max-h-[600px] md:right-4 md:left-auto md:w-[450px] md:rounded-lg md:bottom-4 pb-safe">
        <DrawerHeader className="text-center pb-2 cursor-grab active:cursor-grabbing">
          <div className="flex flex-col items-center gap-3">
            <AssistantCharacter state={getCharacterState()} />
            
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
            <div className="space-y-3">
              {/* "Type Instead" button during recording */}
              {(recordingState === 'recording' || recordingState === 'paused') && (
                <Button
                  variant="outline"
                  onClick={handleTypeInstead}
                  className="w-full"
                >
                  <Keyboard className="h-4 w-4 mr-2" />
                  Type Instead
                </Button>
              )}

              {/* Text Input Area - show when in text mode or not recording */}
              {(isTextMode || recordingState === 'idle' || state === 'complete') && (
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      placeholder="Type or tap the mic to speak..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="min-h-[120px] pr-12 resize-none"
                      disabled={state === 'processing'}
                      autoFocus={isTextMode}
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
                  
                  {/* AI Actions Menu */}
                  {textContent.trim() && (
                    <AIActionsMenu
                      currentText={textContent}
                      onTextUpdate={(newText, replace) => {
                        if (replace) {
                          setTextContent(newText);
                        } else {
                          setTextContent(textContent + '\n\n' + newText);
                        }
                      }}
                      disabled={state === 'processing'}
                    />
                  )}
                  
                  {/* Character count */}
                  {textContent.length > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {textContent.length} characters
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="pt-3 pb-2">
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
