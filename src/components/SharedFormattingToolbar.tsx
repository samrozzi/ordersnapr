import { useEditorFocus } from "@/contexts/EditorFocusContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  ImageIcon,
  Type
} from "lucide-react";
import { useRef } from "react";
import { uploadNoteImage } from "@/lib/note-image-upload";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

export const SharedFormattingToolbar = () => {
  const { activeEditor, setToolbarLocked } = useEditorFocus();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyboardHeight = useKeyboardHeight();

  if (!activeEditor) return null;

  const handleToolbarAction = (action: () => void) => {
    setToolbarLocked(true);
    action();
    setTimeout(() => setToolbarLocked(false), 100);
  };

  const handleFontSizeChange = (size: string) => {
    handleToolbarAction(() => {
      activeEditor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload images");
      return;
    }
    
    try {
      const url = await uploadNoteImage(file, user.id);
      if (url && activeEditor) {
        activeEditor.chain().focus().setImage({ src: url, alt: file.name }).run();
        toast.success("Image uploaded successfully");
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    }
  };

  return (
    <div 
      data-formatting-toolbar
      className="fixed left-0 right-0 z-50 bg-background border-t border-border p-2 animate-in slide-in-from-bottom-2"
      style={{ 
        bottom: `${keyboardHeight}px`,
        transition: 'bottom 0.3s ease-out'
      }}
    >
      <div className="flex items-center gap-1 overflow-x-auto pb-safe">
        <Button
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            setToolbarLocked(true);
          }}
          onClick={() => handleToolbarAction(() => activeEditor.chain().focus().toggleBold().run())}
          className={activeEditor.isActive("bold") ? "bg-accent" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            setToolbarLocked(true);
          }}
          onClick={() => handleToolbarAction(() => activeEditor.chain().focus().toggleItalic().run())}
          className={activeEditor.isActive("italic") ? "bg-accent" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            setToolbarLocked(true);
          }}
          onClick={() => handleToolbarAction(() => activeEditor.chain().focus().toggleUnderline().run())}
          className={activeEditor.isActive("underline") ? "bg-accent" : ""}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Select
          value="1rem"
          onValueChange={handleFontSizeChange}
        >
          <SelectTrigger 
            className="w-[90px] h-9"
            onMouseDown={(e) => {
              e.preventDefault();
              setToolbarLocked(true);
            }}
            onBlur={() => setTimeout(() => setToolbarLocked(false), 100)}
          >
            <Type className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.75rem">Tiny</SelectItem>
            <SelectItem value="0.875rem">Small</SelectItem>
            <SelectItem value="1rem">Normal</SelectItem>
            <SelectItem value="1.125rem">Large</SelectItem>
            <SelectItem value="1.25rem">X-Large</SelectItem>
            <SelectItem value="1.5rem">XX-Large</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            setToolbarLocked(true);
          }}
          onClick={() => handleToolbarAction(() => activeEditor.chain().focus().toggleBulletList().run())}
          className={activeEditor.isActive("bulletList") ? "bg-accent" : ""}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            setToolbarLocked(true);
          }}
          onClick={() => handleToolbarAction(() => activeEditor.chain().focus().toggleOrderedList().run())}
          className={activeEditor.isActive("orderedList") ? "bg-accent" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            setToolbarLocked(true);
          }}
          onClick={() => {
            setToolbarLocked(true);
            fileInputRef.current?.click();
            setTimeout(() => setToolbarLocked(false), 100);
          }}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleImageUpload(file);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
};
