import { useState, useEffect, useRef } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, ChevronDown, FileText, Briefcase, Plus, CheckSquare, FileEdit, MessageSquare } from "lucide-react";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { SimpleAvatar } from "./SimpleAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";
import { transcribeAudio, getOpenAIApiKey } from "@/lib/openai-service";

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
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
  const { toast } = useToast();
  const { createNote } = useNotes();

  const sleepTimeoutRef = useRef<NodeJS.Timeout>();

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
    }, 60000); // 60 seconds
  };

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
    // Don't call setAssistantStatus here - let mode control it
    resetSleepTimer();
  };

  const handleTextFocus = () => {
    setMode("typing");
    if (isRecording) {
      stopRecording(); // Stop mic immediately when focusing text
    }
    resetSleepTimer();
  };

  const handleTextBlur = () => {
    // Keep mode as resting, don't collapse keyboard
    if (mode === "typing") {
      setMode("resting");
    }
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
    if (!textContent.trim()) {
      toast({
        title: "No content",
        description: "Please add some text first",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Work Order",
      description: "Work order creation coming soon",
    });
  };

  const handleAddJob = async () => {
    if (!textContent.trim()) {
      toast({
        title: "No content",
        description: "Please add some text first",
        variant: "destructive",
      });
      return;
    }

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
    return "neutral"; // resting or typing
  };

  const getStatusText = () => {
    if (error) return error;
    if (mode === "listening") return `Listening… ${formattedDuration}`;
    if (isProcessing) return "Thinking…";
    if (assistantStatus === "sleeping") return "Resting…";
    return "Tap to speak or type below";
  };

  const CompactView = () => (
    <div className="flex flex-col h-[45vh] bg-background relative">
      {/* Drag Handle */}
      <div className="flex justify-center py-2">
        <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Avatar and Title */}
      <div className="flex flex-col items-center gap-3 px-6 pt-2 pb-4">
        <SimpleAvatar mood={getAvatarMood()} size={80} />
        <div className="text-center">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">{getStatusText()}</p>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-20">
        {/* Text Area */}
        <Textarea
          value={textContent}
          onChange={handleTextChange}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          placeholder="Transcribed text will appear here, or type directly…"
          className="min-h-[80px] resize-none"
        />

        {/* AI Suggestions - Limited in compact mode */}
        {textContent && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">AI Suggestions</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNote}
                className="w-full justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                Save to Quick Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateWorkOrder}
                className="w-full justify-start"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Create Work Order
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background space-y-3">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
          <Button onClick={handleCreateNote} className="flex-1">
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

      {/* Mic Button - Inside drawer */}
      <button
        onClick={handleMicClick}
        disabled={isProcessing}
        className={cn(
          "mic-button absolute bottom-28 right-6",
          mode === "listening" && "mic-button--recording",
          isProcessing && "mic-button--disabled"
        )}
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );

  const ExpandedView = () => (
    <div className="flex flex-col h-[85vh] bg-background relative">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
          <ChevronDown className="w-4 h-4 mr-2" />
          Done
        </Button>
        <h2 className="text-lg font-semibold">AI Workspace</h2>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Avatar */}
      <div className="flex justify-center px-6 pt-4 pb-2">
        <SimpleAvatar mood={getAvatarMood()} size={96} />
      </div>
      
      <div className="text-center px-6 pb-4">
        <p className="text-sm text-muted-foreground">{getStatusText()}</p>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-24">
        {/* Large Text Area */}
        <Textarea
          value={textContent}
          onChange={handleTextChange}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          placeholder="Continue writing or start fresh…"
          className="min-h-[180px] resize-none text-base"
        />

        {/* AI Suggestions */}
        {textContent && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">AI SUGGESTIONS</h4>
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

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
          <Button onClick={handleCreateNote} className="flex-1">
            Create Note
          </Button>
        </div>
      </div>

      {/* Mic Button - Inside drawer */}
      <button
        onClick={handleMicClick}
        disabled={isProcessing}
        className={cn(
          "mic-button absolute bottom-24 right-6",
          mode === "listening" && "mic-button--recording",
          isProcessing && "mic-button--disabled"
        )}
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        {isExpanded ? <ExpandedView /> : <CompactView />}
      </DrawerContent>
    </Drawer>
  );
}
