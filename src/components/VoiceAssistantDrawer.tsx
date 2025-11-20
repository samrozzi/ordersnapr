import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, ChevronLeft, FileText, Briefcase, Plus, CheckSquare, FileEdit, MessageSquare } from "lucide-react";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { SimpleAvatar } from "./SimpleAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";
import { transcribeAudio, getOpenAIApiKey } from "@/lib/openai-service";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

type AssistantStatus = "idle" | "thinking" | "sleeping" | "error";
type Mode = "resting" | "listening" | "typing";

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceAssistantDrawer({ open, onOpenChange }: VoiceAssistantDrawerProps) {
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>("idle");
  const [mode, setMode] = useState<Mode>("resting");
  const [textContent, setTextContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const { createNote } = useNotes();
  const keyboardHeight = useKeyboardHeight();

  const sleepTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [open]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setAssistantStatus("thinking");
    setError(null);
    resetSleepTimer();

    try {
      const apiKey = await getOpenAIApiKey();
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const result = await transcribeAudio(audioBlob, apiKey);
      setTextContent(result.text);
      setMode("resting");
      setAssistantStatus("idle");
      resetSleepTimer();
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err instanceof Error ? err.message : "Failed to transcribe audio");
      setAssistantStatus("error");
      setTimeout(() => {
        setAssistantStatus("idle");
        resetSleepTimer();
      }, 3000);
    }
  };

  const {
    recordingState,
    formattedDuration,
    startRecording,
    stopRecording,
  } = useVoiceRecording({
    onRecordingComplete: handleRecordingComplete,
    onError: (err) => {
      setError(err.message);
      setAssistantStatus("error");
      setTimeout(() => setAssistantStatus("idle"), 3000);
    },
  });

  const isRecording = recordingState === "recording";
  const isProcessing = assistantStatus === "thinking";

  const resetSleepTimer = () => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
    }
    if (assistantStatus === "sleeping") {
      setAssistantStatus("idle");
    }
    sleepTimeoutRef.current = setTimeout(() => {
      if (mode === "resting" && !isProcessing) {
        setAssistantStatus("sleeping");
      }
    }, 60000);
  };

  useEffect(() => {
    if (open) {
      resetSleepTimer();
    }
    return () => {
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current);
      }
    };
  }, [open]);

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
      setMode("resting");
    } else {
      startRecording();
      setMode("listening");
      resetSleepTimer();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
    resetSleepTimer();
  };

  const handleTextFocus = () => {
    setMode("typing");
    setIsExpanded(true);
    if (isRecording) {
      stopRecording();
    }
    resetSleepTimer();
  };

  const handleTextBlur = () => {
    // Don't change mode or collapse
  };

  const handleClear = () => {
    setTextContent("");
    setError(null);
    setMode("resting");
    setAssistantStatus("idle");
    resetSleepTimer();
  };

  const handleCreateNote = async () => {
    if (!textContent.trim()) {
      toast({
        title: "No content",
        description: "Please add some text first",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNote({
        title: textContent.substring(0, 50) || "Quick Note",
        content: {
          blocks: [{ 
            id: crypto.randomUUID(),
            type: "paragraph", 
            content: textContent 
          }]
        },
      });

      toast({
        title: "Note created",
        description: "Your note has been saved",
      });

      handleClear();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    }
  };

  const handleCreateWorkOrder = async () => {
    toast({
      title: "Work Order",
      description: "Work order creation coming soon",
    });
  };

  const handleAddJob = async () => {
    toast({
      title: "Job",
      description: "Job creation coming soon",
    });
  };

  const callAITransform = async (intent: string) => {
    if (!textContent.trim()) {
      toast({
        title: "No content",
        description: "Please add some text first",
        variant: "destructive",
      });
      return;
    }

    setAssistantStatus("thinking");
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-text-transform", {
        body: { text: textContent, intent },
      });

      if (error) throw error;

      setTextContent(data.result);
      setAssistantStatus("idle");
      toast({
        title: "Success",
        description: `Text transformed: ${intent}`,
      });
    } catch (error) {
      console.error("AI transform error:", error);
      setAssistantStatus("error");
      toast({
        title: "Error",
        description: "Failed to transform text",
        variant: "destructive",
      });
      setTimeout(() => setAssistantStatus("idle"), 2000);
    }
  };

  const handleTurnIntoChecklist = () => callAITransform("checklist");
  const handleSummarize = () => callAITransform("summarize");
  const handleDraftCustomerMessage = () => callAITransform("customer_message");

  const getAvatarMood = (): "neutral" | "listening" | "thinking" | "sleeping" => {
    if (assistantStatus === "sleeping") return "sleeping";
    if (assistantStatus === "thinking") return "thinking";
    if (mode === "listening") return "listening";
    return "neutral";
  };

  const getStatusText = () => {
    if (error) return error;
    if (mode === "listening") return `Listening… ${formattedDuration}`;
    if (assistantStatus === "thinking") return "Thinking…";
    if (assistantStatus === "sleeping") return "Resting…";
    return "Tap to speak or type below";
  };

  if (!open) return null;

  const sheetHeight = isExpanded 
    ? `calc(100vh - ${keyboardHeight}px)` 
    : '45vh';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={() => onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl z-50 flex flex-col transition-all duration-300"
        style={{ height: sheetHeight }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        {!isExpanded ? (
          // COMPACT VIEW
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header with Avatar */}
            <div className="flex flex-col items-center gap-2 px-6 pb-4 flex-shrink-0">
              <SimpleAvatar mood={getAvatarMood()} size={64} />
              <div className="text-center">
                <h3 className="text-base font-semibold">AI Assistant</h3>
                <p className="text-sm text-muted-foreground">{getStatusText()}</p>
              </div>
            </div>

            {/* Single-line text input */}
            <div className="px-6 pb-4 flex-shrink-0">
              <Textarea
                ref={textareaRef}
                value={textContent}
                onChange={handleTextChange}
                onFocus={handleTextFocus}
                onBlur={handleTextBlur}
                placeholder="Transcribed text will appear here, or type directly…"
                className="min-h-[44px] max-h-[44px] resize-none"
                rows={1}
              />
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 space-y-3 flex-shrink-0">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear} className="flex-1">
                  Clear
                </Button>
                <Button onClick={handleCreateNote} className="flex-1" disabled={!textContent.trim()}>
                  Create Note
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(true)}
                className="w-full text-sm text-muted-foreground"
              >
                Open AI Workspace
              </Button>
            </div>

            {/* Mic Button */}
            <button
              onClick={handleMicClick}
              disabled={isProcessing}
              className={cn(
                "mic-button absolute bottom-6 right-6",
                mode === "listening" && "mic-button--recording",
                isProcessing && "mic-button--disabled"
              )}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        ) : (
          // EXPANDED VIEW
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsExpanded(false);
                  textareaRef.current?.blur();
                }}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Done
              </Button>
              <h2 className="flex-1 text-center font-semibold pr-16">AI Workspace</h2>
            </div>

            {/* Avatar */}
            <div className="flex justify-center px-6 pt-4 pb-2 flex-shrink-0">
              <SimpleAvatar mood={getAvatarMood()} size={80} />
            </div>
            
            <div className="text-center px-6 pb-3 flex-shrink-0">
              <p className="text-sm text-muted-foreground">{getStatusText()}</p>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-24">
              {/* Large Text Area */}
              <Textarea
                ref={textareaRef}
                value={textContent}
                onChange={handleTextChange}
                onFocus={handleTextFocus}
                onBlur={handleTextBlur}
                placeholder="Continue writing or start fresh…"
                className="min-h-[180px] resize-none text-base mb-6"
              />

              {/* AI Suggestions */}
              {textContent && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Suggestions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={handleCreateNote}
                      className="w-full justify-start h-auto py-3"
                    >
                      <FileText className="w-5 h-5 mr-3" />
                      <span className="text-base">Save to Quick Note</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCreateWorkOrder}
                      className="w-full justify-start h-auto py-3"
                    >
                      <Briefcase className="w-5 h-5 mr-3" />
                      <span className="text-base">Create Work Order</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleAddJob}
                      className="w-full justify-start h-auto py-3"
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      <span className="text-base">Add Job</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTurnIntoChecklist}
                      className="w-full justify-start h-auto py-3"
                    >
                      <CheckSquare className="w-5 h-5 mr-3" />
                      <span className="text-base">Turn into checklist</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSummarize}
                      className="w-full justify-start h-auto py-3"
                    >
                      <FileEdit className="w-5 h-5 mr-3" />
                      <span className="text-base">Summarize key points</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDraftCustomerMessage}
                      className="w-full justify-start h-auto py-3"
                    >
                      <MessageSquare className="w-5 h-5 mr-3" />
                      <span className="text-base">Draft customer message</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions - Fixed above keyboard */}
            <div 
              className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background flex-shrink-0"
              style={{ 
                transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : 'none',
                transition: 'transform 0.2s ease-out'
              }}
            >
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear} className="flex-1">
                  Clear
                </Button>
                <Button onClick={handleCreateNote} className="flex-1" disabled={!textContent.trim()}>
                  Create Note
                </Button>
              </div>
            </div>

            {/* Mic Button */}
            <button
              onClick={handleMicClick}
              disabled={isProcessing || mode === "typing"}
              className={cn(
                "mic-button absolute right-6",
                mode === "listening" && "mic-button--recording",
                (isProcessing || mode === "typing") && "mic-button--disabled"
              )}
              style={{ 
                bottom: keyboardHeight > 0 ? `${keyboardHeight + 80}px` : '80px',
                transition: 'bottom 0.2s ease-out'
              }}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
