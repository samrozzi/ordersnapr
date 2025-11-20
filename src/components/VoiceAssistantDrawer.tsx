import { useState, useEffect, useRef } from "react";
import { Mic, X, StickyNote, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { transcribeAudio, getOpenAIApiKey } from "@/lib/openai-service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ExpressiveAvatar } from "./ExpressiveAvatar";
import { cn } from "@/lib/utils";

type AssistantStatus = "idle" | "listening" | "typing" | "thinking" | "sleeping" | "error";

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceAssistantDrawer({ open, onOpenChange }: VoiceAssistantDrawerProps) {
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>("idle");
  const [textContent, setTextContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sleepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

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
    cancelRecording,
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

  // Reset sleep timer whenever there's activity
  const resetSleepTimer = () => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
    }
    if (assistantStatus === "sleeping") {
      setAssistantStatus("idle");
    }
    sleepTimeoutRef.current = setTimeout(() => {
      if (open && !isRecording && !isTyping && assistantStatus !== "thinking") {
        setAssistantStatus("sleeping");
      }
    }, 60000); // 60 seconds
  };

  // Sync recording state to assistant status
  useEffect(() => {
    if (isRecording) {
      setAssistantStatus("listening");
      resetSleepTimer();
    }
  }, [isRecording]);

  // Initialize and cleanup sleep timer
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
    resetSleepTimer();
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
      setError(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
    setIsTyping(true);
    setAssistantStatus("typing");
    resetSleepTimer();
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (!isRecording && !isProcessing) {
        setAssistantStatus("idle");
      }
    }, 1000);
  };

  const handleTextFocus = () => {
    resetSleepTimer();
    if (!isRecording && !isProcessing) {
      setAssistantStatus("typing");
    }
  };

  const handleTextBlur = () => {
    // Keep drawer open, don't change state
    resetSleepTimer();
  };

  const handleClear = () => {
    setTextContent("");
    setAssistantStatus("idle");
    setError(null);
    resetSleepTimer();
    if (isRecording) cancelRecording();
  };

  const handleCreateNote = async () => {
    if (!textContent.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create notes");
        return;
      }

      const { error: insertError } = await supabase.from("notes").insert({
        user_id: user.id,
        title: textContent.split('\n')[0].slice(0, 100) || "Voice Note",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: textContent }] }] },
      });

      if (insertError) throw insertError;

      toast.success("Note created successfully");
      handleClear();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create note:", err);
      toast.error("Failed to create note");
    }
  };

  const handleCreateWorkOrder = () => {
    localStorage.setItem('draft_work_order', textContent);
    navigate('/work-orders?draft=true');
    onOpenChange(false);
  };

  const handleAddJob = () => {
    localStorage.setItem('draft_job', textContent);
    navigate('/work-orders?draft=true');
    onOpenChange(false);
  };

  const callAITransform = async (action: string, systemPrompt: string) => {
    const sourceText = textContent.trim();
    if (!sourceText) {
      toast.error("No text to process");
      return;
    }

    setAssistantStatus("thinking");
    setError(null);
    resetSleepTimer();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-text-transform', {
        body: { action, text: sourceText, systemPrompt }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setTextContent(data.transformedText || sourceText);
      setAssistantStatus("idle");
      toast.success("AI transformation complete");
      resetSleepTimer();
    } catch (err) {
      console.error("AI transform error:", err);
      setError(err instanceof Error ? err.message : "AI transformation failed");
      setAssistantStatus("error");
      setTimeout(() => setAssistantStatus("idle"), 3000);
    }
  };

  const handleTurnIntoChecklist = () => {
    callAITransform(
      "checklist",
      "Convert this text into a concise, actionable checklist for a field technician. Use bullet points or checkboxes."
    );
  };

  const handleSummarize = () => {
    callAITransform(
      "summarize",
      "Summarize the key points from this text as short bullet points a technician can quickly scan."
    );
  };

  const handleDraftCustomerMessage = () => {
    callAITransform(
      "customer-message",
      "Rewrite this as a clear, polite message I can send to a customer, using simple language."
    );
  };

  const getAvatarMood = (): AssistantStatus => {
    return assistantStatus;
  };

  const getStatusText = () => {
    if (assistantStatus === "error" && error) return error;
    if (assistantStatus === "listening") return `Listening… ${formattedDuration}`;
    if (assistantStatus === "thinking") return "Thinking…";
    if (assistantStatus === "sleeping") return "Resting…";
    return "Tap to speak or type below";
  };

  const CompactView = () => (
    <div className="flex flex-col h-[45vh] relative">
      {/* Drag Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="h-1 w-12 rounded-full bg-muted/40" />
      </div>

      {/* Header with Avatar */}
      <div className="flex flex-col items-center px-6 py-4 space-y-3">
        <ExpressiveAvatar mood={getAvatarMood()} size={96} />
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-lg">AI Assistant</h3>
          <p className={cn(
            "text-sm transition-colors duration-200",
            assistantStatus === "error" ? "text-destructive" : "text-muted-foreground"
          )}>
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
        <Textarea
          value={textContent}
          onChange={handleTextChange}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          placeholder="Transcribed text will appear here, or type directly…"
          className="min-h-[100px] resize-none rounded-xl border-2 focus-visible:ring-2"
        />

        {/* Error Message */}
        {error && assistantStatus === "error" && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* AI Suggestions */}
        {textContent.trim() && assistantStatus !== "thinking" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AI SUGGESTIONS
            </h4>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={handleCreateNote} className="justify-start h-10">
                <StickyNote className="w-4 h-4 mr-3" />
                Save to Quick Note
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateWorkOrder} className="justify-start h-10">
                Create Work Order
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddJob} className="justify-start h-10">
                Add Job
              </Button>
              <Button variant="outline" size="sm" onClick={handleTurnIntoChecklist} className="justify-start h-10">
                Turn into checklist
              </Button>
              <Button variant="outline" size="sm" onClick={handleSummarize} className="justify-start h-10">
                Summarize key points
              </Button>
              <Button variant="outline" size="sm" onClick={handleDraftCustomerMessage} className="justify-start h-10">
                Draft customer message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t bg-background px-6 py-4 space-y-3">
        <div className="flex gap-3 items-center">
          <Button 
            variant="outline" 
            size="default" 
            onClick={handleClear} 
            className="flex-1"
            disabled={!textContent.trim()}
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button 
            variant="default" 
            size="default" 
            onClick={handleCreateNote}
            disabled={!textContent.trim()}
            className="flex-1"
          >
            <StickyNote className="w-4 h-4 mr-2" />
            Create Note
          </Button>
          <button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={cn(
              "mic-button flex-shrink-0",
              isRecording && "mic-button--recording",
              isProcessing && "mic-button--disabled"
            )}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Open AI Workspace
        </button>
      </div>
    </div>
  );

  const ExpandedView = () => (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
          <ChevronDown className="w-5 h-5 mr-2" />
          Done
        </Button>
        <h2 className="font-semibold text-lg">AI Workspace</h2>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Avatar */}
        <div className="flex justify-center py-2">
          <ExpressiveAvatar mood={getAvatarMood()} size={120} />
        </div>

        {/* Large Text Area */}
        <Textarea
          value={textContent}
          onChange={handleTextChange}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          placeholder="Continue writing or start fresh…"
          className="w-full min-h-[240px] rounded-xl border-2 resize-none text-base leading-relaxed p-4 focus-visible:ring-2"
        />

        {/* Error Message */}
        {error && assistantStatus === "error" && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* AI Suggestions */}
        {textContent.trim() && assistantStatus !== "thinking" && (
          <div className="space-y-4 pb-20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AI SUGGESTIONS
            </h4>
            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleCreateNote} 
                className="justify-start h-12 text-base"
              >
                <StickyNote className="w-5 h-5 mr-3" />
                Save to Quick Note
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleCreateWorkOrder} 
                className="justify-start h-12 text-base"
              >
                Create Work Order
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleAddJob} 
                className="justify-start h-12 text-base"
              >
                Add Job
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleTurnIntoChecklist} 
                className="justify-start h-12 text-base"
              >
                Turn into checklist
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleSummarize} 
                className="justify-start h-12 text-base"
              >
                Summarize key points
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleDraftCustomerMessage} 
                className="justify-start h-12 text-base"
              >
                Draft customer message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint text and mic button */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
        <p className="text-center text-sm text-muted-foreground mb-4">
          {getStatusText()}
        </p>
        
        {/* Mic Button */}
        <div className="flex justify-end">
          <button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={cn(
              "mic-button shadow-xl",
              isRecording && "mic-button--recording",
              isProcessing && "mic-button--disabled"
            )}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            <Mic className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="focus:outline-none">
        {isExpanded ? <ExpandedView /> : <CompactView />}
      </DrawerContent>
    </Drawer>
  );
}
