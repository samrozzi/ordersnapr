import { useState, useEffect } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { transcribeAudio } from "@/lib/openai-service";
import { useNotes } from "@/hooks/use-notes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, Loader2, ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIActionsMenu } from "./AIActionsMenu";

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
  const [aiChatInput, setAiChatInput] = useState("");
  
  const { createNote } = useNotes();

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
        openai_api_key: apiKeyInput.trim(),
      });

    if (saveError) {
      toast.error("Failed to save API key");
      return;
    }

    setHasApiKey(true);
    setApiKeyInput("");
    toast.success("API key saved");
  };

  const handleMicClick = () => {
    if (state === "processing") return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
      setError(null);
    }
  };

  const handleCreateNote = async () => {
    if (!textContent.trim()) return;

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
      
      toast.success("Note created");
      handleReset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to create note");
    }
  };

  const handleReset = () => {
    setTextContent("");
    setError(null);
    setState("idle");
  };

  const handleRetry = () => {
    setError(null);
    setState("idle");
  };

  const getStatusText = () => {
    if (state === "error") return "Something went wrong";
    if (state === "recording") return `Listening… ${formatDuration(duration)}`;
    if (state === "processing") return "Transcribing your voice…";
    if (state === "complete") return "Transcription complete · Edit or create your note";
    return "Ready to record";
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // API Key Setup View
  if (hasApiKey === false) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] h-[45vh] max-h-[600px]">
          <div className="flex justify-center pt-2">
            <div className="w-[100px] h-1.5 rounded-full bg-muted" />
          </div>

          <div className="flex items-start gap-3 p-4 border-b">
            <img src="/ai-bot.svg" alt="AI Assistant" className="w-8 h-8 ai-bot-avatar" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">Setup required</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                To use voice transcription, please enter your OpenAI API key:
              </p>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2 px-4 pb-4 border-t pt-4">
            <Button onClick={handleSaveApiKey} className="w-full">
              Save API Key
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Cancel
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Compact View Component
  const CompactView = () => (
    <>
      <div className="flex items-start gap-3 p-4 border-b">
        <img src="/ai-bot.svg" alt="AI Assistant" className="w-8 h-8 ai-bot-avatar" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">AI Assistant</h3>
          <p className={cn(
            "text-sm",
            state === "error" ? "text-amber-600" : "text-muted-foreground"
          )}>
            {getStatusText()}
          </p>
          {state === "error" && error && (
            <div className="text-sm text-muted-foreground mt-1">
              {error}
              <button 
                onClick={handleRetry} 
                className="ml-2 underline hover:text-amber-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <Textarea
          placeholder="Start speaking or type to add a note…"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          className="min-h-[140px] rounded-lg resize-none"
          disabled={state === "processing"}
        />

        {textContent.trim() && (
          <AIActionsMenu
            currentText={textContent}
            onTextUpdate={(newText, replace) => {
              setTextContent(replace ? newText : textContent + '\n\n' + newText);
            }}
            disabled={state === "processing"}
          />
        )}
      </div>

      <div className="space-y-2 px-4 pb-4 border-t pt-4">
        <Button 
          onClick={handleCreateNote} 
          disabled={!textContent.trim() || state === "processing"} 
          className="w-full"
        >
          Create Note
        </Button>
        <Button 
          variant="outline" 
          onClick={handleReset} 
          className="w-full"
          disabled={state === "processing"}
        >
          Clear
        </Button>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-sm text-primary hover:underline py-2"
        >
          Open AI Workspace
        </button>
      </div>

      {/* Mic Button */}
      <button
        onClick={handleMicClick}
        disabled={state === "processing"}
        className={cn(
          "absolute bottom-4 right-4 h-12 w-12 rounded-full",
          "flex items-center justify-center transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isRecording
            ? "bg-primary/10 text-primary animate-pulse"
            : "bg-card border border-input hover:bg-muted"
        )}
      >
        {state === "processing" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      {/* Timer overlay */}
      {isRecording && (
        <div className="absolute bottom-16 right-4 bg-background/90 border rounded-md px-2 py-1 text-xs font-mono shadow-sm">
          {formatDuration(duration)}
        </div>
      )}
    </>
  );

  // Expanded View Component
  const ExpandedView = () => (
    <>
      <div className="flex items-center justify-between h-14 px-4 border-b">
        <button 
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
        >
          <ChevronDown className="h-4 w-4" />
          Done
        </button>
        <h2 className="font-semibold">AI Workspace</h2>
        <div className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-1">
          ordersnapr.com · Private
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-start gap-2">
          <img src="/ai-bot.svg" alt="AI Assistant" className="w-6 h-6 mt-1" />
          <Textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="flex-1 min-h-[200px] rounded-lg resize-none"
            placeholder="Your content here…"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">AI Suggestions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => {/* TODO: Implement */}}>
              Summarize this
            </Button>
            <Button variant="outline" size="sm" onClick={() => {/* TODO: Implement */}}>
              Create Quick Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => {/* TODO: Implement */}}>
              Highlight action items
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t p-3 flex items-center gap-2">
        <Input
          placeholder="Ask, refine, or make changes…"
          value={aiChatInput}
          onChange={(e) => setAiChatInput(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              // TODO: Handle AI chat
            }
          }}
        />
        <Button size="icon" disabled={!aiChatInput.trim()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </>
  );

  return (
    <Drawer 
      open={open} 
      onOpenChange={onOpenChange}
      dismissible={!isExpanded}
      shouldScaleBackground={false}
    >
      <DrawerContent 
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          isExpanded 
            ? "h-screen rounded-t-none" 
            : "h-[45vh] max-h-[600px] rounded-t-[20px]",
          "transition-all duration-300 ease-in-out"
        )}
      >
        {!isExpanded && (
          <div className="flex justify-center pt-2">
            <div className="w-[100px] h-1.5 rounded-full bg-muted" />
          </div>
        )}
        
        {isExpanded ? <ExpandedView /> : <CompactView />}
      </DrawerContent>
    </Drawer>
  );
}
