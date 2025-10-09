import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, X, Minus } from "lucide-react";

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
        {items.map((item, index) => {
          const currentValue = checklist[index] || "N/A";
          return (
            <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-3 pb-3 border-b last:border-b-0">
              <Label className="flex-1 text-sm pt-2">
                {index + 1}. {item}
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => handleStatusChange(index, "OK")}
                  className={`h-12 w-12 ${
                    currentValue === "OK" 
                      ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                      : "hover:bg-green-50"
                  }`}
                >
                  <Check className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => handleStatusChange(index, "DEV")}
                  className={`h-12 w-12 ${
                    currentValue === "DEV" 
                      ? "bg-red-600 hover:bg-red-700 text-white border-red-600" 
                      : "hover:bg-red-50"
                  }`}
                >
                  <X className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => handleStatusChange(index, "N/A")}
                  className={`h-12 w-12 ${
                    currentValue === "N/A" 
                      ? "bg-gray-400 hover:bg-gray-500 text-white border-gray-400" 
                      : "hover:bg-gray-50"
                  }`}
                >
                  <Minus className="h-6 w-6" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
