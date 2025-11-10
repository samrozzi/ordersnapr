import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { cn } from '@/lib/utils';
import { uploadNoteImage } from '@/lib/note-image-upload';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useEditorFocus } from '@/contexts/EditorFocusContext';

// Custom extension for font size
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  variant?: 'paragraph' | 'heading';
  onFocus?: () => void;
  onBlur?: () => void;
  disableEnterKey?: boolean;
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
  disableEnterKey = false,
}: RichTextEditorProps) => {
  const { user } = useAuth();
  const { setActiveEditor, toolbarLocked } = useEditorFocus();
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextStyle,
      FontSize,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-[150px] h-auto rounded-lg my-2 cursor-pointer',
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
      // Don't clear if toolbar is being interacted with
      if (toolbarLocked) return;
      
      // Check if the blur is due to clicking within the formatting toolbar
      const relatedTarget = props.event?.relatedTarget as HTMLElement;
      if (relatedTarget && relatedTarget.closest('[data-formatting-toolbar]')) {
        return; // Don't clear the active editor if clicking toolbar
      }
      
      setTimeout(() => {
        if (!toolbarLocked) {
          setActiveEditor(null);
        }
      }, 1000);
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
      handleKeyDown: (view, event) => {
        // Prevent Enter key from creating line breaks in checklist items
        if (disableEnterKey && event.key === 'Enter' && !event.shiftKey) {
          return true; // Prevent default TipTap behavior
        }
        return false;
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
