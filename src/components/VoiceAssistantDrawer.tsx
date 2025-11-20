import { useState, useEffect } from "react";
import { Mic, X, StickyNote, ChevronLeft } from "lucide-react";
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

type AssistantState = "idle" | "recording" | "processing" | "complete" | "error";
type AvatarMood = "idle" | "listening" | "thinking" | "typing" | "sleep" | "error";

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceAssistantDrawer({ open, onOpenChange }: VoiceAssistantDrawerProps) {
  const [state, setState] = useState<AssistantState>("idle");
  const [textContent, setTextContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setState("processing");
    setError(null);

    try {
      const apiKey = await getOpenAIApiKey();
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const result = await transcribeAudio(audioBlob, apiKey);
      setTextContent(result.text);
      setState("complete");
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err instanceof Error ? err.message : "Failed to transcribe audio");
      setState("error");
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
      setState("error");
    },
  });

  const isRecording = recordingState === "recording";
  const isProcessing = state === "processing";

  useEffect(() => {
    if (isRecording) {
      setState("recording");
    } else if (recordingState === "idle" && state === "recording") {
      setState("idle");
    }
  }, [isRecording, recordingState, state]);

  const handleMicClick = () => {
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
    
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => setIsTyping(false), 1000);
    setTypingTimeout(timeout);
  };

  const handleClear = () => {
    setTextContent("");
    setState("idle");
    setError(null);
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

    setState("processing");
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-text-transform', {
        body: { action, text: sourceText, systemPrompt }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setTextContent(data.transformedText || sourceText);
      setState("complete");
      toast.success("AI transformation complete");
    } catch (err) {
      console.error("AI transform error:", err);
      setError(err instanceof Error ? err.message : "AI transformation failed");
      setState("error");
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

  const getAvatarMood = (): AvatarMood => {
    if (state === "error") return "error";
    if (isProcessing) return "thinking";
    if (isRecording) return "listening";
    if (isTyping) return "typing";
    if (!open) return "sleep";
    return "idle";
  };

  const getStatusText = () => {
    if (state === "error" && error) return error;
    if (isRecording) return `Listening… ${formattedDuration}`;
    if (isProcessing) return "Thinking…";
    return "Tap to speak or type below";
  };

  const CompactView = () => (
    <div className="flex flex-col h-[45vh]">
      {/* Drag Handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="h-1.5 w-[100px] rounded-full bg-muted opacity-20" />
      </div>

      {/* Header with Avatar */}
      <div className="flex flex-col items-center p-4 border-b space-y-2">
        <ExpressiveAvatar mood={getAvatarMood()} size={64} />
        <div className="text-center space-y-0.5">
          <h3 className="font-semibold text-base">AI Assistant</h3>
          <p className={cn(
            "text-sm transition-colors duration-200",
            state === "error" ? "text-amber-600" : "text-muted-foreground"
          )}>
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <Textarea
          value={textContent}
          onChange={handleTextChange}
          onFocus={() => setIsExpanded(true)}
          placeholder="Transcribed text will appear here, or type directly…"
          className="min-h-[80px] resize-none rounded-lg"
        />

        {/* AI Suggestions */}
        {textContent.trim() && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Suggestions</h3>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={handleCreateNote} className="justify-start">
                <StickyNote className="w-4 h-4 mr-2" />
                Save to Quick Note
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateWorkOrder} className="justify-start">
                Create Work Order
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddJob} className="justify-start">
                Add Job
              </Button>
              <Button variant="outline" size="sm" onClick={handleTurnIntoChecklist} className="justify-start">
                Turn into checklist
              </Button>
              <Button variant="outline" size="sm" onClick={handleSummarize} className="justify-start">
                Summarize key points
              </Button>
              <Button variant="outline" size="sm" onClick={handleDraftCustomerMessage} className="justify-start">
                Draft customer message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t p-4 space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleCreateNote}
            disabled={!textContent.trim()}
            className="flex-1"
          >
            <StickyNote className="w-4 h-4 mr-2" />
            Create Note
          </Button>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Open AI Workspace
        </button>
      </div>

      {/* Floating Mic Button */}
      <button
        onClick={handleMicClick}
        disabled={isProcessing}
        className={cn(
          "mic-button absolute bottom-4 right-4 w-14 h-14 flex items-center justify-center shadow-lg z-10",
          isRecording && "mic-button--recording",
          isProcessing && "mic-button--disabled"
        )}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <Mic className="w-6 h-6" />
      </button>
    </div>
  );

  const ExpandedView = () => (
    <div className="flex flex-col h-screen">
      {/* Drag Handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="h-1.5 w-[80px] rounded-full bg-muted opacity-30" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b">
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Done
        </Button>
        <h2 className="font-semibold text-base">AI Workspace</h2>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Avatar and Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center pt-2">
          <ExpressiveAvatar mood={getAvatarMood()} size={80} />
        </div>

        <Textarea
          value={textContent}
          onChange={handleTextChange}
          placeholder="Continue writing or start fresh…"
          className="w-full min-h-[200px] rounded-lg resize-none text-base"
        />

        {/* AI Suggestions */}
        {textContent.trim() && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Suggestions</h3>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={handleCreateNote} className="justify-start">
                <StickyNote className="w-4 h-4 mr-2" />
                Save to Quick Note
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateWorkOrder} className="justify-start">
                Create Work Order
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddJob} className="justify-start">
                Add Job
              </Button>
              <Button variant="outline" size="sm" onClick={handleTurnIntoChecklist} className="justify-start">
                Turn into checklist
              </Button>
              <Button variant="outline" size="sm" onClick={handleSummarize} className="justify-start">
                Summarize key points
              </Button>
              <Button variant="outline" size="sm" onClick={handleDraftCustomerMessage} className="justify-start">
                Draft customer message
              </Button>
            </div>
          </div>
        )}

        {/* Status Text */}
        <p className={cn(
          "text-center text-sm transition-colors duration-200",
          state === "error" ? "text-amber-600" : "text-muted-foreground"
        )}>
          {getStatusText()}
        </p>
      </div>

      {/* Floating Mic Button */}
      <button
        onClick={handleMicClick}
        disabled={isProcessing}
        className={cn(
          "mic-button absolute bottom-4 right-4 w-14 h-14 flex items-center justify-center shadow-lg z-10",
          isRecording && "mic-button--recording",
          isProcessing && "mic-button--disabled"
        )}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <Mic className="w-6 h-6" />
      </button>
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
