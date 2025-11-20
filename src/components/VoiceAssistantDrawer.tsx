import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Sparkles, ListTodo, Wand2, ChevronLeft, ChevronDown, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SimpleAvatar } from './SimpleAvatar';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { transcribeAudio, getOpenAIApiKey } from '@/lib/openai-service';

type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'sleeping';
type Mode = 'resting' | 'listening' | 'typing';

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceAssistantDrawer({ open, onOpenChange }: VoiceAssistantDrawerProps) {
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>('idle');
  const [mode, setMode] = useState<Mode>('resting');
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const keyboardHeight = useKeyboardHeight();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      setIsExpanded(false);
      setTextContent('');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [open]);

  // Auto-focus textarea when expanded and in typing mode (iOS keyboard fix)
  useEffect(() => {
    if (isExpanded && mode === 'typing' && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isExpanded, mode]);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    setAssistantStatus('thinking');
    setError(null);

    try {
      const apiKey = await getOpenAIApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const result = await transcribeAudio(audioBlob, apiKey);
      setTextContent(prev => prev ? `${prev}\n${result.text}` : result.text);
      setMode('resting');
      setAssistantStatus('idle');
    } catch (err) {
      console.error('Transcription error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to transcribe audio';
      setError(errorMsg);
      toast.error(errorMsg);
      setAssistantStatus('idle');
    }
  }, []);

  const {
    recordingState,
    startRecording,
    stopRecording,
  } = useVoiceRecording({
    onRecordingComplete: handleRecordingComplete,
    onError: (err) => {
      setError(err.message);
      setMode('resting');
      setAssistantStatus('idle');
      toast.error(err.message);
    },
  });

  const isRecording = recordingState === 'recording';

  const handleMicToggle = useCallback(() => {
    // Blur textarea to dismiss keyboard
    if (textareaRef.current) {
      textareaRef.current.blur();
    }

    if (isRecording) {
      stopRecording();
      setMode('resting');
      setAssistantStatus('idle');
    } else {
      startRecording();
      setMode('listening');
      setAssistantStatus('listening');
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleTextFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (isRecording) {
      stopRecording();
      setAssistantStatus('idle');
    }
    setMode('typing');
    setIsExpanded(true);
  }, [isRecording, stopRecording]);

  const handleTextBlur = useCallback(() => {
    // Reset mode to resting after a delay if no activity
    blurTimeoutRef.current = setTimeout(() => {
      if (mode === 'typing' && !textContent) {
        setMode('resting');
      }
    }, 200);
  }, [mode, textContent]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsExpanded(false);
    if (textareaRef.current) {
      textareaRef.current.blur();
    }
  }, []);

  const handleClear = useCallback(() => {
    setTextContent('');
    setError(null);
  }, []);

  const handleCreateNote = useCallback(async () => {
    if (!textContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    setAssistantStatus('thinking');
    try {
      const { error: insertError } = await supabase
        .from('notes')
        .insert({
          title: textContent.split('\n')[0].slice(0, 100) || 'Untitled Note',
          content: [{ type: 'paragraph', content: textContent }],
          user_id: user?.id,
        });

      if (insertError) throw insertError;

      toast.success('Note created successfully!');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      handleClear();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating note:', err);
      toast.error('Failed to create note');
    } finally {
      setAssistantStatus('idle');
    }
  }, [textContent, user, queryClient, handleClear, onOpenChange]);

  const callAITransform = async (intent: string) => {
    if (!textContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    // Map intent to systemPrompt
    const systemPromptMap: Record<string, string> = {
      make_professional: "Rewrite the following text in a professional, polished tone. Keep the meaning intact but make it more formal and well-structured.",
      make_list: "Convert the following text into a clear, organized bullet-point list. Extract key points and format them as a list.",
      summarize: "Summarize the following text concisely. Keep only the most important points."
    };

    const systemPrompt = systemPromptMap[intent] || "Transform the following text appropriately.";

    setAssistantStatus('thinking');
    try {
      const { data, error } = await supabase.functions.invoke('ai-text-transform', {
        body: { text: textContent, systemPrompt },
      });

      if (error) throw error;
      if (data?.transformed) {
        setTextContent(data.transformed);
        toast.success('Text transformed!');
      }
    } catch (err) {
      console.error('AI transform error:', err);
      toast.error('Failed to transform text');
    } finally {
      setAssistantStatus('idle');
    }
  };

  const getAvatarMood = () => {
    if (assistantStatus === 'thinking') return 'thinking';
    if (assistantStatus === 'listening' || mode === 'listening') return 'listening';
    if (assistantStatus === 'sleeping') return 'sleeping';
    return 'neutral';
  };

  const getStatusText = () => {
    if (mode === 'listening') return 'Listening...';
    if (mode === 'typing') return 'Type your thoughts...';
    if (assistantStatus === 'thinking') return 'Processing...';
    return 'Tap to speak or type...';
  };

  if (!open) return null;

  const micButtonBottom = isExpanded 
    ? Math.max(keyboardHeight + 20, 80) 
    : 140; // Higher in compact mode to avoid overlap
  const drawerHeight = isExpanded 
    ? keyboardHeight > 0 
      ? `calc(100vh - ${keyboardHeight}px)` 
      : '100vh'
    : '45vh';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
        onClick={() => onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl z-[70] transition-all duration-300 ease-out overflow-hidden"
        style={{ 
          height: drawerHeight,
          maxHeight: '100vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact View */}
        {!isExpanded && (
          <div className="flex flex-col h-full p-6 pb-20">
            {/* Drag Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
            </div>

            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <SimpleAvatar mood={getAvatarMood()} size={64} />
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-1">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">{getStatusText()}</p>
            </div>

            {/* Single-line Input */}
            <div
              className="w-full p-3 mb-4 bg-muted/50 rounded-lg border border-border cursor-text text-sm min-h-[48px] flex items-center"
              onClick={handleTextFocus}
            >
              <span className={textContent ? 'text-foreground' : 'text-muted-foreground'}>
                {textContent || 'Transcribed text will appear here, or type directly...'}
              </span>
            </div>

            {/* AI Quick Actions */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">AI Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={handleCreateNote}
                  disabled={!textContent.trim()}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Save to Quick Note
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => callAITransform('make_list')}
                  disabled={!textContent.trim()}
                >
                  <ListTodo className="w-3 h-3 mr-1" />
                  Make a List
                </Button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!textContent}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={!textContent.trim()}
                className="flex-1"
              >
                Create Note
              </Button>
            </div>

            {/* Open AI Workspace Link */}
            <button
              className="mt-4 text-sm text-primary hover:underline text-center"
              onClick={() => setIsExpanded(true)}
            >
              Open AI Workspace
            </button>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimize}
                className="flex items-center gap-2"
              >
                <ChevronDown className="w-5 h-5" />
                <span className="text-sm">Minimize</span>
              </Button>
              <h3 className="text-lg font-semibold flex-1 text-center">AI Workspace</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimize}
              >
                Done
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <SimpleAvatar mood={getAvatarMood()} size={80} />
              </div>

              <p className="text-sm text-muted-foreground text-center mb-4">
                {getStatusText()}
              </p>

              {/* Text Area */}
              <Textarea
                ref={textareaRef}
                value={textContent}
                onChange={handleTextChange}
                onFocus={handleTextFocus}
                onBlur={handleTextBlur}
                placeholder="Tap to type or use the mic to speak..."
                className="min-h-[200px] resize-none text-base mb-6 touch-manipulation"
                style={{ fontSize: '16px' }} // Prevents iOS zoom
              />

              {/* AI Suggestions */}
              {textContent.trim() && (
                <div className="space-y-3 pb-24">
                  <p className="text-sm font-medium text-muted-foreground">AI Suggestions</p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-sm"
                      onClick={() => callAITransform('make_professional')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Make it look professional
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-sm"
                      onClick={() => callAITransform('make_list')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <ListTodo className="w-4 h-4 mr-2" />
                      Turn into a list
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-sm"
                      onClick={() => callAITransform('summarize')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Summarize
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div 
              className="shrink-0 flex gap-2 px-4 py-3 border-t border-border bg-background transition-transform duration-200"
              style={{
                transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : 'none',
              }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!textContent}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={!textContent.trim() || assistantStatus === 'thinking'}
                className="flex-1"
              >
                Create Note
              </Button>
            </div>
          </div>
        )}

        {/* Mic Button - Fixed Position */}
        <button
          onClick={handleMicToggle}
          className={`absolute right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
            isRecording ? 'animate-pulse' : ''
          }`}
          style={{ 
            bottom: `${micButtonBottom}px`,
            zIndex: 80,
          }}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <>
              <div className="absolute inset-0 rounded-full bg-purple-400 opacity-40 animate-pulse" />
              <Pause className="w-6 h-6 relative z-10" />
            </>
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 z-[80]">
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
