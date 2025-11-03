import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChecklistFieldProps {
  items: string[];
  options: string[]; // e.g., ["OK", "DEV", "N/A"] or ["Yes", "No", "N/A"]
  value: Record<number, string>;
  onChange: (value: Record<number, string>) => void;
  readOnly?: boolean;
  label?: string;
}

export function ChecklistField({
  items,
  options,
  value,
  onChange,
  readOnly = false,
  label,
}: ChecklistFieldProps) {
  const handleOptionClick = (itemIndex: number, option: string) => {
    if (readOnly) return;
    const newValue = { ...value };
    newValue[itemIndex] = option;
    onChange(newValue);
  };

  const getOptionColor = (option: string) => {
    const opt = option.toUpperCase();
    if (opt === "OK" || opt === "YES") return "default";
    if (opt === "DEV" || opt === "NO") return "destructive";
    if (opt === "N/A") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-3">
      {label && <h4 className="font-medium text-sm text-foreground">{label}</h4>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card"
          >
            <span className="flex-1 text-sm text-card-foreground leading-relaxed">
              {item}
            </span>
            {readOnly ? (
              <Badge variant={getOptionColor(value[index] || "")}>
                {value[index] || "—"}
              </Badge>
            ) : (
              <div className="flex gap-1.5 shrink-0">
                {options.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={value[index] === option ? getOptionColor(option) : "outline"}
                    onClick={() => handleOptionClick(index, option)}
                    className={cn(
                      "h-8 px-3 text-xs transition-all",
                      value[index] === option && "shadow-sm"
                    )}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
