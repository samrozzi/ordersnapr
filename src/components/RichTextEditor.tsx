import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  RemoveFormatting,
  ImageIcon,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { uploadNoteImage } from '@/lib/note-image-upload';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  variant?: 'paragraph' | 'heading';
  showPersistentToolbar?: boolean;
}

export const RichTextEditor = ({
  content,
  onChange,
  placeholder = 'Start typing...',
  className,
  autoFocus = false,
  variant = 'paragraph',
  showPersistentToolbar = false,
}: RichTextEditorProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        setShowMenu(true);
      } else {
        setShowMenu(false);
      }
    },
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          variant === 'heading' && 'text-2xl font-bold',
          'min-h-[40px] p-2'
        ),
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              event.preventDefault();
              const file = items[i].getAsFile();
              if (file) {
                handleImageUpload(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!editor || !user) return;

    try {
      setUploading(true);
      const imageUrl = await uploadNoteImage(file, user.id);
      
      editor.chain().focus().setImage({ src: imageUrl }).run();
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  if (!editor) {
    return null;
  }

  const ToolbarButtons = () => (
    <>
      {/* Image upload buttons */}
      {isMobile && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => cameraInputRef.current?.click()}
          className="h-8 w-8 p-0"
          disabled={uploading}
          title="Take photo"
        >
          <Camera className="h-4 w-4" />
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        className="h-8 w-8 p-0"
        disabled={uploading}
        title="Insert image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button
        size="sm"
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="h-8 w-8 p-0"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className="h-8 w-8 p-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button
        size="sm"
        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className="h-8 w-8 p-0"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className="h-8 w-8 p-0"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className="h-8 w-8 p-0"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button
        size="sm"
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className="h-8 w-8 p-0"
      >
        <RemoveFormatting className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <div className={cn('relative', className)}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <EditorContent editor={editor} />

      {/* Persistent Toolbar - iOS Notes Style */}
      {showPersistentToolbar && (
        <div className="sticky bottom-0 left-0 right-0 z-50 flex items-center gap-1 bg-background border-t p-2 overflow-x-auto shadow-lg">
          <ToolbarButtons />
        </div>
      )}

      {/* Floating Bubble Menu - appears on text selection (desktop only) */}
      {showMenu && !showPersistentToolbar && (
        <div className="absolute z-50 flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-md">
          <ToolbarButtons />
        </div>
      )}
    </div>
  );
};
