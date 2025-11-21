import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Pause, X, Minus, Sparkles, ListTodo, Wand2, ChevronDown, CheckSquare, Smile, FileText, Briefcase, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SimpleAvatar } from './SimpleAvatar';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { transcribeAudio } from '@/lib/openai-service';
import { cn } from '@/lib/utils';
import { AIProviderSetupDialog } from './AIProviderSetupDialog';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useDebouncedCallback } from 'use-debounce';
import { useActiveOrg } from '@/hooks/use-active-org';

type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'sleeping';
type Mode = 'resting' | 'listening' | 'typing';

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceAssistantDrawer = React.memo(({ open, onOpenChange }: VoiceAssistantDrawerProps) => {
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>('idle');
  const [mode, setMode] = useState<Mode>('resting');
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProviderSetup, setShowProviderSetup] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const dragThreshold = 50; // pixels to drag before triggering action
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const keyboardHeight = useKeyboardHeight();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const compactInputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { activeOrg } = useActiveOrg();
  
  const { data: userPreferences } = useUserPreferences(user?.id || null, activeOrg?.id || null);

  // Check if AI provider is configured
  useEffect(() => {
    if (open && user && userPreferences) {
      console.log('[Voice Assistant] Checking AI provider config:', {
        configured: userPreferences.ai_provider_configured,
        provider: userPreferences.ai_provider
      });
      if (!userPreferences.ai_provider_configured) {
        console.log('[Voice Assistant] Showing provider setup dialog');
        setShowProviderSetup(true);
      }
    }
  }, [open, user, userPreferences]);

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

  // Scroll to top when keyboard opens
  useEffect(() => {
    if (isExpanded && keyboardHeight > 0) {
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [keyboardHeight, isExpanded]);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    const timestamp = new Date().toISOString();
    console.log(`🎤 [${timestamp}] Recording complete:`, {
      size: audioBlob.size,
      type: audioBlob.type,
      sizeInMB: (audioBlob.size / 1024 / 1024).toFixed(2),
      provider: userPreferences?.ai_provider || 'unknown'
    });
    
    // Show accuracy warning for Lovable AI users (once per session)
    if (userPreferences?.ai_provider === 'lovable' && !sessionStorage.getItem('lovable_ai_warning_shown')) {
      toast.info('Using Lovable AI transcription', {
        description: 'For best accuracy, switch to OpenAI Whisper in Profile > AI Assistant Settings',
        duration: 6000,
      });
      sessionStorage.setItem('lovable_ai_warning_shown', 'true');
    }
    
    setAssistantStatus('thinking');
    setError(null);

    try {
      console.log(`🔄 [${timestamp}] Starting transcription with ${userPreferences?.ai_provider || 'default'}...`);
      const result = await transcribeAudio(audioBlob);
      const endTimestamp = new Date().toISOString();
      console.log(`✅ [${endTimestamp}] Transcription complete:`, {
        text: result.text,
        length: result.text.length,
        provider: userPreferences?.ai_provider
      });
      setTextContent(result.text);
      setAssistantStatus('idle');
    } catch (error) {
      const errorTimestamp = new Date().toISOString();
      console.error(`❌ [${errorTimestamp}] Transcription error:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      
      // If error is about missing API key, show setup dialog
      if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
        console.log('[Voice Assistant] Configuration issue detected, showing setup dialog');
        setShowProviderSetup(true);
        setError('Please configure your AI provider to use voice transcription');
        toast.error('Please configure your AI provider to use voice transcription');
      } else {
        setError(errorMessage);
        toast.error(errorMessage);
      }
      
      setAssistantStatus('idle');
    }
  }, [userPreferences]);

  const {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
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
  const isPaused = recordingState === 'paused';

  const handleMicToggle = useCallback(() => {
    // Blur textarea to dismiss keyboard
    if (textareaRef.current) {
      textareaRef.current.blur();
    }

    if (isPaused) {
      // Resume recording
      resumeRecording();
      setMode('listening');
      setAssistantStatus('listening');
    } else if (isRecording) {
      // Pause recording
      pauseRecording();
      setMode('resting');
      setAssistantStatus('idle');
    } else {
      // Start NEW recording - clear old transcription
      console.log('🎙️ Starting new recording, clearing old transcription');
      setTextContent('');
      setError(null);
      startRecording();
      setMode('listening');
      setAssistantStatus('listening');
    }
  }, [isRecording, isPaused, startRecording, pauseRecording, resumeRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    setMode('resting');
    setAssistantStatus('idle');
  }, [stopRecording]);

  const handleCompactViewClick = useCallback(() => {
    setIsExpanded(true);
    setMode('typing');
    if (isRecording) {
      stopRecording();
    }
    
    // Focus with delay for iOS reliability
    setTimeout(() => {
      textareaRef.current?.focus();
      
      // Scroll to top AFTER focus to account for keyboard
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
      
      // Retry focus if needed
      setTimeout(() => {
        if (document.activeElement !== textareaRef.current) {
          textareaRef.current?.focus();
        }
      }, 100);
    }, 250);
  }, [isRecording, stopRecording]);

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
    
    // Scroll to top when focusing
    setTimeout(() => {
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  }, [isRecording, stopRecording]);

  const handleTextBlur = useCallback(() => {
    // Don't auto-reset mode - let user explicitly minimize
  }, []);

  // Debounced text change to prevent excessive re-renders
  const debouncedSetTextContent = useDebouncedCallback((value: string) => {
    setTextContent(value);
  }, 100);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    e.target.value = value; // Keep input responsive
    debouncedSetTextContent(value);
  }, [debouncedSetTextContent]);

  const handleMinimize = useCallback(() => {
    setIsExpanded(false);
    setMode('resting');
    setAssistantStatus('sleeping');
    if (textareaRef.current) {
      textareaRef.current.blur();
    }
    // Allow keyboard to fully dismiss
    setTimeout(() => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    }, 100);
  }, []);

  const handleClear = useCallback(() => {
    setTextContent('');
    setError(null);
  }, []);

  const handleDragStart = useCallback((clientY: number) => {
    setDragStart(clientY);
    setDragCurrent(clientY);
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragStart !== null) {
      setDragCurrent(clientY);
    }
  }, [dragStart]);

  const handleDragEnd = useCallback(() => {
    if (dragStart !== null && dragCurrent !== null) {
      const dragDistance = dragCurrent - dragStart;
      
      if (isExpanded && dragDistance > dragThreshold) {
        // Dragged down while expanded - minimize
        handleMinimize();
      } else if (!isExpanded && dragDistance < -dragThreshold) {
        // Dragged up while compact - expand
        setIsExpanded(true);
        setMode('typing');
      }
    }
    
    setDragStart(null);
    setDragCurrent(null);
  }, [dragStart, dragCurrent, isExpanded, dragThreshold, handleMinimize]);

  const extractTitle = (content: string): string => {
    // Check for explicit title patterns
    const titleMatch = content.match(/^(?:title|heading|subject):\s*(.+)$/im);
    if (titleMatch) {
      return titleMatch[1].trim().slice(0, 100);
    }
    
    // Use timestamp-based title
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `Voice Note - ${timeStr}`;
  };

  const handleCreateNote = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to create notes');
      return;
    }

    if (!textContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    setAssistantStatus('thinking');
    try {
      // Fetch user's active_org_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_org_id')
        .eq('id', user.id)
        .single();

      // Extract title and prepare content
      const title = extractTitle(textContent);
      const bodyContent = textContent;
      
      // Create proper note structure with blocks
      const noteContent = {
        blocks: [
          {
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'paragraph',
            content: bodyContent
          }
        ]
      };

      const { error: insertError } = await supabase
        .from('notes')
        .insert({
          title,
          content: noteContent,
          user_id: user.id,
          org_id: profile?.active_org_id || null,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      toast.success('Note created successfully!');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      handleClear();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating note:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to create note';
      toast.error(errorMsg);
    } finally {
      setAssistantStatus('idle');
    }
  }, [textContent, user, queryClient, handleClear, onOpenChange]);

  const callAITransform = useCallback(async (intent: string) => {
    if (!user) {
      toast.error('Please sign in to use AI features');
      return;
    }

    if (!textContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    // Map intent to systemPrompt
    const systemPromptMap: Record<string, string> = {
      extract_tasks: "Extract all action items and tasks from the following text. Format them as a clear, numbered checklist. Only include actionable items, not general statements.",
      add_emojis: "Add relevant emojis throughout the following text to make it more engaging and expressive. Keep the original text intact but enhance it with contextually appropriate emojis.",
      fix_grammar: "Fix all grammar, spelling, and punctuation errors in the following text. Keep the tone and meaning intact, just polish the language.",
      make_friendly: "Rewrite the following text in a warm, friendly, and conversational tone. Make it feel personal and approachable while keeping the core message.",
      make_professional: "Rewrite the following text in a professional, polished, and formal tone. Make it suitable for business communication while keeping the meaning intact.",
      make_list: "Convert the following text into a clear, organized bullet-point list. Extract key points and format them as a list with proper hierarchy if needed."
    };

    const systemPrompt = systemPromptMap[intent] || "Transform the following text appropriately.";

    setAssistantStatus('thinking');
    try {
      const { data, error } = await supabase.functions.invoke('ai-text-transform', {
        body: { action: intent, text: textContent, systemPrompt },
      });

      if (error) throw error;
      if (data?.transformedText) {
        setTextContent(data.transformedText);
        toast.success('Text transformed!');
      } else {
        throw new Error('No transformed text returned');
      }
    } catch (err) {
      console.error('AI transform error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to transform text';
      toast.error(errorMsg);
    } finally {
      setAssistantStatus('idle');
    }
  }, [textContent]);

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

  // Show provider setup dialog if not configured
  if (showProviderSetup) {
    return (
      <AIProviderSetupDialog
        open={showProviderSetup}
        onOpenChange={setShowProviderSetup}
        onComplete={() => setShowProviderSetup(false)}
      />
    );
  }

  const micButtonBottom = isExpanded 
    ? Math.max(keyboardHeight + 20, 80) 
    : 140;

  // Desktop Floating Card
  if (!isMobile) {
    return (
      <>
        {/* Backdrop for both compact and expanded states */}
        <div 
          className={cn(
            "fixed inset-0 z-[60]",
            isExpanded 
              ? "bg-black/20 backdrop-blur-sm" 
              : "bg-transparent"
          )}
          onClick={() => {
            if (isExpanded) {
              setIsExpanded(false);
            } else {
              onOpenChange(false);
            }
          }}
        />

        {/* Floating Card */}
        <div
          className={`fixed bg-background rounded-2xl shadow-2xl border border-border z-[70] overflow-hidden transition-all duration-300 ${
            isExpanded ? 'bottom-6 right-6 w-[600px] h-[700px]' : 'bottom-6 right-6 w-[400px]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact State */}
          {!isExpanded && (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <SimpleAvatar mood={getAvatarMood()} size={40} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">{getStatusText()}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  value={textContent}
                  onChange={handleTextChange}
                  onFocus={() => {
                    setIsExpanded(true);
                    setMode('typing');
                  }}
                  placeholder="Ask, search, or make anything..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* Expanded State */}
          {isExpanded && (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b shrink-0">
                <h3 className="text-sm font-semibold">AI Workspace</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleMinimize}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex justify-center mb-4">
                  <SimpleAvatar mood={getAvatarMood()} size={64} />
                </div>

                <p className="text-sm text-muted-foreground text-center mb-4">
                  {getStatusText()}
                </p>

                <Textarea
                  ref={textareaRef}
                  value={textContent}
                  onChange={handleTextChange}
                  placeholder="Type your thoughts..."
                  className="min-h-[200px] text-sm resize-none mb-4"
                />

                {/* AI Magic Suggestions */}
                {textContent.trim() && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">AI Magic</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start text-left p-3 gap-1"
                        onClick={() => callAITransform('extract_tasks')}
                        disabled={assistantStatus === 'thinking'}
                      >
                        <CheckSquare className="w-4 h-4 mb-1 text-primary" />
                        <span className="text-xs font-semibold">Extract Tasks</span>
                        <span className="text-[10px] text-muted-foreground">Find action items</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start text-left p-3 gap-1"
                        onClick={() => callAITransform('add_emojis')}
                        disabled={assistantStatus === 'thinking'}
                      >
                        <Smile className="w-4 h-4 mb-1 text-primary" />
                        <span className="text-xs font-semibold">Add Emojis</span>
                        <span className="text-[10px] text-muted-foreground">Make it engaging</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start text-left p-3 gap-1"
                        onClick={() => callAITransform('fix_grammar')}
                        disabled={assistantStatus === 'thinking'}
                      >
                        <Sparkles className="w-4 h-4 mb-1 text-primary" />
                        <span className="text-xs font-semibold">Fix Grammar</span>
                        <span className="text-[10px] text-muted-foreground">Polish & proofread</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start text-left p-3 gap-1"
                        onClick={() => callAITransform('make_friendly')}
                        disabled={assistantStatus === 'thinking'}
                      >
                        <MessageCircle className="w-4 h-4 mb-1 text-primary" />
                        <span className="text-xs font-semibold">Friendly Tone</span>
                        <span className="text-[10px] text-muted-foreground">Warm & casual</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start text-left p-3 gap-1"
                        onClick={() => callAITransform('make_professional')}
                        disabled={assistantStatus === 'thinking'}
                      >
                        <Briefcase className="w-4 h-4 mb-1 text-primary" />
                        <span className="text-xs font-semibold">Professional</span>
                        <span className="text-[10px] text-muted-foreground">Formal & polished</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start text-left p-3 gap-1"
                        onClick={() => callAITransform('make_list')}
                        disabled={assistantStatus === 'thinking'}
                      >
                        <FileText className="w-4 h-4 mb-1 text-primary" />
                        <span className="text-xs font-semibold">Listify</span>
                        <span className="text-[10px] text-muted-foreground">Bullet points</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleClear} disabled={!textContent} className="flex-1">
                  Clear
                </Button>
                <Button size="sm" onClick={handleCreateNote} disabled={!textContent.trim() || assistantStatus === 'thinking'} className="flex-1">
                  Create Note
                </Button>
              </div>
            </div>
          )}

          {/* Floating Mic Button - Always visible, position changes based on state */}
          <div className={cn(
            "absolute flex gap-2 z-10",
            isExpanded 
              ? "bottom-20 right-4"
              : "top-4 right-4"
          )}>
            {(isRecording || isPaused) ? (
              <>
                {/* Pause/Resume Button */}
                <button
                  onClick={handleMicToggle}
                  className={cn(
                    "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all",
                    isRecording 
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-110" 
                      : "bg-gradient-to-br from-blue-500 to-cyan-500 hover:scale-110"
                  )}
                >
                  {isRecording ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
                
                {/* Stop Button */}
                <button
                  onClick={handleStopRecording}
                  className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all bg-gradient-to-br from-red-500 to-pink-500 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </>
            ) : (
              /* Start Recording Button */
              <button
                onClick={handleMicToggle}
                className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-110"
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 z-[80]">
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-6 w-6 p-0">
                ×
              </Button>
            </div>
          )}
        </div>
      </>
    );
  }

  // Mobile Full-Width Drawer
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
          height: isExpanded ? '100dvh' : '45vh',
          maxHeight: '100vh',
          transform: dragStart && dragCurrent && !isExpanded ? 
            `translateY(${Math.max(dragCurrent - dragStart, -100)}px)` : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact View */}
        {!isExpanded && (
          <div className="flex flex-col h-full p-6 pb-20">
            {/* Drag Handle */}
            <div 
              className="flex justify-center mb-4 cursor-grab active:cursor-grabbing py-2 -mt-2"
              onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
              onMouseDown={(e) => handleDragStart(e.clientY)}
              onMouseMove={(e) => dragStart && handleDragMove(e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <div 
                className="w-12 h-1 bg-muted-foreground/30 rounded-full transition-all"
                style={{
                  transform: dragStart && dragCurrent ? `translateY(${Math.min(Math.max(dragCurrent - dragStart, -20), 20)}px)` : 'none'
                }}
              />
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

            {/* Hidden Input for iOS Keyboard */}
            <input
              ref={compactInputRef}
              type="text"
              className="sr-only"
              onFocus={handleCompactViewClick}
            />
            
            {/* Single-line Input */}
            <div
              className="w-full p-3 mb-4 bg-muted/50 rounded-lg border border-border cursor-text text-sm min-h-[48px] flex items-center"
              onClick={handleCompactViewClick}
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
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header - Sticky */}
              <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
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
            <div 
              ref={contentRef} 
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 20}px` : '120px' }}
            >
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
                  <p className="text-sm font-medium text-muted-foreground">AI Magic</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-auto flex-col items-start text-left p-3 gap-1"
                      onClick={() => callAITransform('extract_tasks')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <CheckSquare className="w-4 h-4 mb-1 text-primary" />
                      <span className="text-xs font-semibold">Extract Tasks</span>
                      <span className="text-[10px] text-muted-foreground">Find action items</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col items-start text-left p-3 gap-1"
                      onClick={() => callAITransform('add_emojis')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <Smile className="w-4 h-4 mb-1 text-primary" />
                      <span className="text-xs font-semibold">Add Emojis</span>
                      <span className="text-[10px] text-muted-foreground">Make it engaging</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col items-start text-left p-3 gap-1"
                      onClick={() => callAITransform('fix_grammar')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <Sparkles className="w-4 h-4 mb-1 text-primary" />
                      <span className="text-xs font-semibold">Fix Grammar</span>
                      <span className="text-[10px] text-muted-foreground">Polish & proofread</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col items-start text-left p-3 gap-1"
                      onClick={() => callAITransform('make_friendly')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <MessageCircle className="w-4 h-4 mb-1 text-primary" />
                      <span className="text-xs font-semibold">Friendly Tone</span>
                      <span className="text-[10px] text-muted-foreground">Warm & casual</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col items-start text-left p-3 gap-1"
                      onClick={() => callAITransform('make_professional')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <Briefcase className="w-4 h-4 mb-1 text-primary" />
                      <span className="text-xs font-semibold">Professional</span>
                      <span className="text-[10px] text-muted-foreground">Formal & polished</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col items-start text-left p-3 gap-1"
                      onClick={() => callAITransform('make_list')}
                      disabled={assistantStatus === 'thinking'}
                    >
                      <FileText className="w-4 h-4 mb-1 text-primary" />
                      <span className="text-xs font-semibold">Listify</span>
                      <span className="text-[10px] text-muted-foreground">Bullet points</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div 
              className="shrink-0 flex gap-2 px-4 border-t border-border bg-background"
              style={{
                paddingTop: '12px',
                paddingBottom: `${Math.max(keyboardHeight + 12, 12)}px`,
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

        {/* Mic button container - Fixed bottom-right position */}
        <div className="fixed bottom-20 right-4 z-[100]">
          {/* Idle State: Single Mic Button */}
          {!isRecording && !isPaused && (
            <button
              onClick={handleMicToggle}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300 animate-in fade-in-0 zoom-in-95"
            >
              <Mic className="w-6 h-6 text-white" />
            </button>
          )}
          
          {/* Recording/Paused State: Two Buttons (Split Animation) */}
          {(isRecording || isPaused) && (
            <div className="flex gap-2 animate-in fade-in-0 zoom-in-95 duration-300">
              {/* Pause/Resume Button */}
              <button
                onClick={handleMicToggle}
                className={cn(
                  "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110",
                  "animate-in slide-in-from-right-4 fade-in-0",
                  isRecording 
                    ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                    : "bg-gradient-to-br from-blue-500 to-cyan-500"
                )}
                style={{
                  animationDelay: '50ms'
                }}
              >
                {isRecording ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-white" />
                )}
              </button>
              
              {/* Stop Button */}
              <button
                onClick={handleStopRecording}
                className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-500 transition-all duration-300 hover:scale-110 animate-in slide-in-from-right-4 fade-in-0"
                style={{
                  animationDelay: '100ms'
                }}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>

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
});
