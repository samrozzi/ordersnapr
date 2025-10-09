import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChecklistSectionProps {
  title: string;
  items: string[];
  checklist: Record<number, string>;
  onChecklistChange: (checklist: Record<number, string>) => void;
}

export const ChecklistSection = ({ title, items, checklist, onChecklistChange }: ChecklistSectionProps) => {
  const handleStatusChange = (index: number, value: string) => {
    onChecklistChange({
      ...checklist,
      [index]: value,
    });
  };

  return (
    <div className="space-y-4">
      {title && <h3 className="font-semibold text-lg mb-4">{title}</h3>}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3 border-b last:border-b-0">
            <Label className="flex-1 text-sm">
              {index + 1}. {item}
            </Label>
            <Select
              value={checklist[index] || "N/A"}
              onValueChange={(value) => handleStatusChange(index, value)}
            >
              <SelectTrigger className="w-full sm:w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="N/A">N/A</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="DEV">DEV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
};
