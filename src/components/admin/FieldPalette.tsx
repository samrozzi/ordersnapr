import {
  FileText,
  AlignLeft,
  Hash,
  CalendarDays,
  Clock,
  List,
  CheckSquare,
  CircleDot,
  ListChecks,
  Paperclip,
  PenTool,
  Copy,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "checkbox"
  | "radio"
  | "checklist"
  | "file"
  | "signature"
  | "address"
  | "repeating_group";

export interface FieldTypeDefinition {
  type: FieldType;
  icon: typeof FileText;
  label: string;
  description: string;
}

export const fieldTypes: FieldTypeDefinition[] = [
  { type: "text", icon: FileText, label: "Text", description: "Single-line text" },
  { type: "textarea", icon: AlignLeft, label: "Text Area", description: "Multi-line text" },
  { type: "number", icon: Hash, label: "Number", description: "Numeric field" },
  { type: "date", icon: CalendarDays, label: "Date", description: "Date picker" },
  { type: "time", icon: Clock, label: "Time", description: "Time picker" },
  { type: "select", icon: List, label: "Select", description: "Dropdown list" },
  { type: "checkbox", icon: CheckSquare, label: "Checkbox", description: "True/False" },
  { type: "radio", icon: CircleDot, label: "Radio", description: "Choose one option" },
  { type: "checklist", icon: ListChecks, label: "Checklist", description: "Multi-select" },
  { type: "file", icon: Paperclip, label: "File Upload", description: "Upload files/photos" },
  { type: "signature", icon: PenTool, label: "Signature", description: "Draw or type signature" },
  { type: "address", icon: MapPin, label: "Address", description: "Structured address inputs" },
  { type: "repeating_group", icon: Copy, label: "Repeating Group", description: "Add multiple entries" },
];

interface FieldPaletteProps {
  onFieldSelect: (type: FieldType) => void;
  className?: string;
}

export function FieldPalette({ onFieldSelect, className }: FieldPaletteProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold mb-3 text-foreground">Field Types</h3>
      <div className="grid gap-2">
        {fieldTypes.map((field) => {
          const Icon = field.icon;
          return (
            <button
              key={field.type}
              type="button"
              onClick={() => onFieldSelect(field.type)}
              className="group relative flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary transition-all duration-200 text-left"
              title={`Add ${field.label}`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {field.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {field.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
