import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { transcribeAudio } from "@/lib/openai-service";
import { useNotes } from "@/hooks/use-notes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, Loader2, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceWaveform } from "./VoiceWaveform";

interface VoiceAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AssistantState = 
  | "idle"
  | "recording"
  | "processing"
  | "complete"
  | "error";

export function VoiceAssistantDrawer({ open, onOpenChange }: VoiceAssistantDrawerProps) {
  const [state, setState] = useState<AssistantState>("idle");
  const [textContent, setTextContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { createNote } = useNotes();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setState("processing");
    setError(null);

    try {
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
      
      if (!apiKey) {
        const storedApiKey = localStorage.getItem('openai_api_key');
        if (storedApiKey && storedApiKey !== '""' && storedApiKey !== 'null') {
          apiKey = storedApiKey.startsWith('"') ? JSON.parse(storedApiKey) : storedApiKey;
        }
      }
      
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please configure it in settings.');
      }

      const result = await transcribeAudio(audioBlob, apiKey);
      setTextContent(result.text);
      setState("complete");
      toast.success("Transcription complete");
    } catch (err) {
      console.error("Transcription error:", err);
      setState("error");
      setError(err instanceof Error ? err.message : "Transcription failed. Tap to retry recording.");
    }
  };

  const {
    recordingState,
    duration,
    startRecording,
    stopRecording,
  } = useVoiceRecording({
    onRecordingComplete: handleRecordingComplete,
  });

  const isRecording = recordingState === 'recording';

  useEffect(() => {
    if (isRecording) {
      setState("recording");
    }
  }, [isRecording]);

  useEffect(() => {
    const checkApiKey = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_preferences")
        .select("openai_api_key")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasApiKey(!!data?.openai_api_key);
    };

    if (open) {
      checkApiKey();
      setIsExpanded(false);
    }
  }, [open]);

  // Auto-expand when text grows beyond 4 lines
  const textLines = textContent.split('\n').length;
  useEffect(() => {
    if (textLines > 4 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [textLines, isExpanded]);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: saveError } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        openai_api_key: apiKeyInput.trim()
      });

    if (saveError) {
      toast.error("Failed to save API key");
      return;
    }

    toast.success("API key saved successfully");
    setHasApiKey(true);
    setApiKeyInput("");
  };

  const handleCreateNote = async () => {
    if (!textContent.trim()) {
      toast.error("Please add some content first");
      return;
    }

    try {
      await createNote({
        title: textContent.split('\n')[0].slice(0, 100) || "Voice Note",
        content: {
          blocks: [
            {
              id: crypto.randomUUID(),
              type: "paragraph",
              content: textContent,
            },
          ],
        },
      });

      toast.success("Note created successfully");
      setTextContent("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error("Failed to create note");
    }
  };

  const handleSaveQuickNote = async () => {
    await handleCreateNote();
  };

  const handleCreateWorkOrder = () => {
    if (!textContent.trim()) {
      toast.error("Please add some content first");
      return;
    }
    localStorage.setItem('draft_work_order', textContent);
    navigate('/work-orders?draft=true');
    onOpenChange(false);
    toast.success("Opening work order form with your content");
  };

  const handleAddJob = () => {
    if (!textContent.trim()) {
      toast.error("Please add some content first");
      return;
    }
    localStorage.setItem('draft_job', textContent);
    navigate('/work-orders?draft=true');
    onOpenChange(false);
    toast.success("Opening job form with your content");
  };

  const handleClear = () => {
    setTextContent("");
    setState("idle");
    setError(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (state === "error") return "Something went wrong";
    if (state === "recording") return `Listening… ${formatDuration(duration)}`;
    if (state === "processing") return "Processing…";
    return "Tap to speak or type below";
  };

  const getAvatarSrc = () => {
    if (state === 'processing') return '/ai-bot-thinking.svg';
    if (state === 'error') return '/ai-bot-sleep.svg';
    return '/ai-bot.svg';
  };

  const CompactView = () => (
    <div className="flex flex-col h-[45vh]">
      {/* Header with centered avatar */}
      <div className="flex flex-col items-center p-4 border-b space-y-2">
        <img src={getAvatarSrc()} alt="AI Assistant" className="w-10 h-10 transition-all duration-300" />
        <div className="text-center space-y-0.5">
          <h3 className="font-semibold text-base">AI Assistant</h3>
          <div className="flex items-center justify-center gap-2">
            <p className={cn(
              "text-sm transition-colors duration-200",
              state === "error" ? "text-amber-600" : "text-muted-foreground"
            )}>
              {getStatusText()}
            </p>
            {isRecording && <VoiceWaveform isRecording={true} />}
          </div>
          {state === "error" && error && (
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 mt-1">
              <span>{error}</span>
              <button 
                onClick={startRecording} 
                className="underline hover:text-amber-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <Textarea
          ref={textareaRef}
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="Transcribed text will appear here, or type directly..."
          className="min-h-[80px] resize-none rounded-lg"
          disabled={state === "recording" || state === "processing"}
        />

        {textContent.trim() && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Actions</h3>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveQuickNote} className="justify-start">
                Save to Quick Note
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateWorkOrder} className="justify-start">
                Create Work Order
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddJob} className="justify-start">
                Add Job
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-4 space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!textContent.trim() || state === "recording"}
            className="flex-1 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
          >
            Clear
          </Button>
          <Button
            onClick={handleCreateNote}
            disabled={!textContent.trim() || state === "recording"}
            className="flex-1 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
          >
            Create Note
          </Button>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-sm text-primary hover:underline transition-colors"
        >
          Open AI Workspace
        </button>
      </div>

      {/* Microphone button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={state === "processing"}
        className={cn(
          "absolute bottom-4 right-4 rounded-full p-4 shadow-lg transition-all duration-200",
          isRecording
            ? "bg-destructive text-destructive-foreground animate-pulse"
            : "bg-primary text-primary-foreground hover:scale-110",
          state === "processing" && "opacity-50 cursor-not-allowed"
        )}
      >
        {state === "processing" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>
    </div>
  );

  const ExpandedView = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Done
        </Button>
        <h3 className="font-semibold">AI Workspace</h3>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Content with centered large avatar */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <img src={getAvatarSrc()} alt="AI Assistant" className="w-16 h-16 transition-all duration-300" />
          <Textarea
            ref={textareaRef}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Continue writing or start fresh..."
            className="w-full min-h-[200px] rounded-lg resize-none"
            disabled={state === "recording" || state === "processing"}
          />
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Suggestions</h4>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveQuickNote} className="justify-start">
              Save to Quick Note
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateWorkOrder} className="justify-start">
              Create Work Order
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddJob} className="justify-start">
              Add Job
            </Button>
          </div>
        </div>
      </div>

      {/* Microphone button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={state === "processing"}
        className={cn(
          "absolute bottom-6 right-6 rounded-full p-4 shadow-lg transition-all duration-200",
          isRecording
            ? "bg-destructive text-destructive-foreground animate-pulse"
            : "bg-primary text-primary-foreground hover:scale-110",
          state === "processing" && "opacity-50 cursor-not-allowed"
        )}
      >
        {state === "processing" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>
    </div>
  );

  if (hasApiKey === false) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh] rounded-t-[24px] shadow-2xl dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-center pt-2">
            <div className="h-1.5 w-[100px] rounded-full bg-muted opacity-20" />
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <img src="/ai-bot.svg" alt="AI Assistant" className="w-12 h-12" />
              <h3 className="font-semibold text-lg">OpenAI API Key Required</h3>
              <p className="text-sm text-muted-foreground text-center">
                To use voice transcription, please add your OpenAI API key
              </p>
            </div>
            
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="rounded-lg"
              />
              <Button onClick={handleSaveApiKey} className="w-full rounded-lg">
                Save API Key
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              You can also add it in Settings → Preferences
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn(
        "max-h-[95vh] rounded-t-[24px] shadow-2xl",
        "dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
      )}>
        {/* Drag Handle - always visible */}
        <div className="flex justify-center pt-2">
          <div className={cn(
            "h-1.5 rounded-full bg-muted transition-all duration-200",
            isExpanded ? "w-[80px] opacity-30" : "w-[100px] opacity-20"
          )} />
        </div>

        {isExpanded ? <ExpandedView /> : <CompactView />}
      </DrawerContent>
    </Drawer>
  );
}
