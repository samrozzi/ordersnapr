import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { Field } from "./FormCanvas";

export interface PresetStructure {
  id: string;
  name: string;
  icon: typeof Phone;
  description: string;
  fields: Field[];
}

export const fieldPresets: PresetStructure[] = [
  {
    id: "technician-table",
    name: "Technician Table",
    icon: Phone,
    description: "2x2 tech info table with call tracking",
    fields: [
      // The table
      {
        id: crypto.randomUUID(),
        key: "technician_info",
        type: "table_layout",
        label: "Technician Information",
        placeholder: "",
        required: false,
        tableRows: 2,
        tableColumns: 2,
        borderStyle: "all",
        tableCells: {
          "0-0": {
            field: {
              id: crypto.randomUUID(),
              key: "tech_name",
              type: "text",
              label: "Tech Name",
              placeholder: "",
              required: false,
            }
          },
          "0-1": {
            field: {
              id: crypto.randomUUID(),
              key: "tech_id",
              type: "text",
              label: "Tech ID",
              placeholder: "",
              required: false,
            }
          },
          "1-0": {
            field: {
              id: crypto.randomUUID(),
              key: "tech_type",
              type: "text",
              label: "Tech Type",
              placeholder: "",
              required: false,
            }
          },
          "1-1": {
            field: {
              id: crypto.randomUUID(),
              key: "tech_tn",
              type: "text",
              label: "Tech TN",
              placeholder: "",
              required: false,
            }
          }
        }
      } as Field,
      // Time field
      {
        id: crypto.randomUUID(),
        key: "call_time",
        type: "time",
        label: "Call time",
        placeholder: "",
        required: false,
      },
      // Notes field with no label
      {
        id: crypto.randomUUID(),
        key: "call_notes",
        type: "text",
        label: "",
        hideLabel: true,
        placeholder: "Add notes here...",
        required: false,
      }
    ]
  }
];

interface FieldPresetsProps {
  onPresetSelect: (preset: PresetStructure) => void;
  className?: string;
}

export function FieldPresets({ onPresetSelect, className }: FieldPresetsProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold mb-3 text-foreground">Quick Presets</h3>
      <div className="space-y-2">
        {fieldPresets.map((preset) => {
          const Icon = preset.icon;
          return (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 px-3"
              onClick={() => onPresetSelect(preset)}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{preset.name}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
