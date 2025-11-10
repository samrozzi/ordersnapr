import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  value: { startDate?: string; endDate?: string };
  onChange: (range: { startDate?: string; endDate?: string }) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState("all");

  const presets = [
    { label: "All Time", value: "all" },
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
    { label: "This Month", value: "month" },
    { label: "This Quarter", value: "quarter" },
    { label: "This Year", value: "year" },
    { label: "Last Year", value: "lastyear" },
  ];

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);

    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (preset) {
      case "all":
        onChange({});
        return;

      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;

      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;

      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;

      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;

      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;

      case "lastyear":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }

    if (startDate) {
      onChange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
    }
  };

  const getDisplayText = () => {
    if (!value.startDate && !value.endDate) {
      return "All Time";
    }

    const preset = presets.find(p => p.value === selectedPreset);
    if (preset) {
      return preset.label;
    }

    if (value.startDate && value.endDate) {
      return `${new Date(value.startDate).toLocaleDateString()} - ${new Date(value.endDate).toLocaleDateString()}`;
    }

    return "Select Date Range";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal">
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="end">
        <div className="space-y-2">
          <div className="text-sm font-medium mb-2">Date Range</div>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
