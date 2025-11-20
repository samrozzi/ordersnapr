import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Pencil, FileText, CheckSquare, Calendar, Languages, Briefcase, SmileIcon, Lightbulb, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  systemPrompt: string;
  replaceText: boolean;
}

const AI_ACTIONS: AIAction[] = [
  {
    id: 'continue',
    label: 'Continue writing',
    icon: <Pencil className="h-4 w-4" />,
    description: 'Expand on the current text',
    systemPrompt: 'Continue writing based on the provided text. Maintain the same style, tone, and context. Write 2-3 additional sentences that naturally flow from the existing content.',
    replaceText: false,
  },
  {
    id: 'improve',
    label: 'Improve writing',
    icon: <Sparkles className="h-4 w-4" />,
    description: 'Enhance clarity and flow',
    systemPrompt: 'Improve the writing by enhancing clarity, flow, and readability. Keep the core message the same but make it more engaging and professional. Return only the improved text.',
    replaceText: true,
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: <FileText className="h-4 w-4" />,
    description: 'Create a concise summary',
    systemPrompt: 'Create a concise summary of the provided text. Capture the key points in 2-3 sentences. Return only the summary.',
    replaceText: true,
  },
  {
    id: 'tasks',
    label: 'Create task list',
    icon: <CheckSquare className="h-4 w-4" />,
    description: 'Extract action items',
    systemPrompt: 'Extract action items from the text and format them as a clear, prioritized task list. Use markdown checkboxes (- [ ] format). Return only the task list.',
    replaceText: true,
  },
  {
    id: 'agenda',
    label: 'Create agenda',
    icon: <Calendar className="h-4 w-4" />,
    description: 'Format as meeting agenda',
    systemPrompt: 'Format the text as a professional meeting agenda with time slots, topics, and action items. Use clear headers and bullet points. Return only the formatted agenda.',
    replaceText: true,
  },
  {
    id: 'professional',
    label: 'Make professional',
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Use formal tone',
    systemPrompt: 'Rewrite the text in a professional, formal tone suitable for business communication. Maintain all key information but use more formal language. Return only the rewritten text.',
    replaceText: true,
  },
  {
    id: 'casual',
    label: 'Make casual',
    icon: <SmileIcon className="h-4 w-4" />,
    description: 'Use conversational tone',
    systemPrompt: 'Rewrite the text in a friendly, conversational tone. Make it feel more casual and approachable while keeping the key information. Return only the rewritten text.',
    replaceText: true,
  },
  {
    id: 'translate',
    label: 'Translate',
    icon: <Languages className="h-4 w-4" />,
    description: 'Translate to Spanish',
    systemPrompt: 'Translate the text to Spanish. Maintain the tone and meaning as closely as possible. Return only the translated text.',
    replaceText: true,
  },
  {
    id: 'explain',
    label: 'Explain',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Break down complex concepts',
    systemPrompt: 'Explain the text in simpler terms. Break down complex concepts into easy-to-understand language. Use analogies if helpful. Return only the explanation.',
    replaceText: true,
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Generate related ideas',
    systemPrompt: 'Generate 5-7 creative ideas or suggestions related to the provided text. Present them as a bulleted list. Be creative and think outside the box. Return only the list.',
    replaceText: false,
  },
];

interface AIActionsMenuProps {
  currentText: string;
  onTextUpdate: (newText: string, replace: boolean) => void;
  disabled?: boolean;
}

export function AIActionsMenu({ currentText, onTextUpdate, disabled }: AIActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleAction = async (action: AIAction) => {
    if (!currentText.trim()) {
      toast.error('Please enter some text first');
      return;
    }

    setIsProcessing(true);
    setProcessingAction(action.id);

    try {
      const { data, error } = await supabase.functions.invoke('ai-text-transform', {
        body: {
          action: action.id,
          text: currentText,
          systemPrompt: action.systemPrompt,
        },
      });

      if (error) {
        // Handle specific error types
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('Please add credits to your Lovable workspace to continue.');
        } else {
          toast.error('AI transformation failed: ' + error.message);
        }
        return;
      }

      if (data?.transformedText) {
        onTextUpdate(data.transformedText, action.replaceText);
        toast.success(`${action.label} completed!`);
        setOpen(false);
      } else {
        toast.error('No response from AI');
      }
    } catch (error) {
      console.error('AI action error:', error);
      toast.error('Failed to process AI action');
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || !currentText.trim()}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Actions
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              AI Actions
            </div>
            {AI_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 px-3"
                onClick={() => handleAction(action)}
                disabled={isProcessing}
              >
                {processingAction === action.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  action.icon
                )}
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium">{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
