import { useState, useEffect, useRef } from "react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { 
  Heading1, 
  List, 
  Table, 
  Image, 
  Calendar, 
  Minus, 
  Clock,
  Type
} from "lucide-react";

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  blockType: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "heading",
    label: "Heading",
    description: "Large section heading",
    icon: <Heading1 className="h-4 w-4" />,
    blockType: "heading"
  },
  {
    id: "paragraph",
    label: "Text",
    description: "Plain text paragraph",
    icon: <Type className="h-4 w-4" />,
    blockType: "paragraph"
  },
  {
    id: "checklist",
    label: "Checklist",
    description: "Task list with checkboxes",
    icon: <List className="h-4 w-4" />,
    blockType: "checklist"
  },
  {
    id: "table",
    label: "Table",
    description: "Insert a table",
    icon: <Table className="h-4 w-4" />,
    blockType: "table"
  },
  {
    id: "image",
    label: "Image",
    description: "Upload or embed an image",
    icon: <Image className="h-4 w-4" />,
    blockType: "imageUpload"
  },
  {
    id: "date",
    label: "Date",
    description: "Add a date picker",
    icon: <Calendar className="h-4 w-4" />,
    blockType: "date"
  },
  {
    id: "time",
    label: "Time",
    description: "Add a time picker",
    icon: <Clock className="h-4 w-4" />,
    blockType: "time"
  },
  {
    id: "divider",
    label: "Divider",
    description: "Visual separator",
    icon: <Minus className="h-4 w-4" />,
    blockType: "divider"
  }
];

interface SlashCommandMenuProps {
  onSelect: (blockType: string) => void;
  onClose: () => void;
  searchQuery?: string;
  position?: { top: number; left: number };
}

export function SlashCommandMenu({ onSelect, onClose, searchQuery = "", position }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = SLASH_COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].blockType);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, filteredCommands, onSelect, onClose]);

  if (filteredCommands.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 w-80 rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 p-4"
        style={position ? { top: position.top, left: position.left } : {}}
      >
        <div className="text-sm text-muted-foreground text-center">
          <p className="font-medium mb-1">No blocks found for "{searchQuery}"</p>
          <p className="text-xs">Try: heading, text, table, checklist, image, date</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-80 rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
      style={position ? { top: position.top, left: position.left } : {}}
    >
      <Command>
        <CommandList>
          <CommandGroup heading="Basic Blocks">
            {filteredCommands.map((cmd, index) => (
              <CommandItem
                key={cmd.id}
                onSelect={() => onSelect(cmd.blockType)}
                className={selectedIndex === index ? "bg-accent" : ""}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0">{cmd.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{cmd.label}</div>
                    <div className="text-xs text-muted-foreground">{cmd.description}</div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
