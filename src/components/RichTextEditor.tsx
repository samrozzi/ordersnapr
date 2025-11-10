import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { uploadNoteImage } from '@/lib/note-image-upload';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useEditorFocus } from '@/contexts/EditorFocusContext';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  variant?: 'paragraph' | 'heading';
  onFocus?: () => void;
  onBlur?: () => void;
}

export const RichTextEditor = ({
  content,
  onChange,
  placeholder = 'Start typing...',
  className,
  autoFocus = false,
  variant = 'paragraph',
  onFocus,
  onBlur,
}: RichTextEditorProps) => {
  const { user } = useAuth();
  const { setActiveEditor } = useEditorFocus();
  
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
    onFocus: () => {
      if (editor) {
        setActiveEditor(editor);
      }
      onFocus?.();
    },
    onBlur: (props) => {
      // Check if the blur is due to clicking within the formatting toolbar
      const relatedTarget = props.event?.relatedTarget as HTMLElement;
      if (relatedTarget && relatedTarget.closest('[data-formatting-toolbar]')) {
        return; // Don't clear the active editor if clicking toolbar
      }
      
      setTimeout(() => {
        setActiveEditor(null);
      }, 500);
      onBlur?.();
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
    if (!editor || !user) {
      toast.error("You must be logged in to upload images");
      return;
    }

    try {
      const imageUrl = await uploadNoteImage(file, user.id);
      editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <EditorContent editor={editor} />
    </div>
  );
};
