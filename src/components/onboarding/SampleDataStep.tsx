import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Database, Briefcase, Home, Users, FileText, Check } from "lucide-react";

interface SampleDataStepProps {
  includeSampleData: boolean;
  sampleDataTypes: string[];
  onUpdate: (data: { includeSampleData?: boolean; sampleDataTypes?: string[] }) => void;
  onNext: () => void;
  onBack: () => void;
}

const SAMPLE_DATA_OPTIONS = [
  {
    id: "work_orders",
    name: "Work Orders",
    description: "5 example jobs with different statuses",
    icon: Briefcase,
    count: 5,
  },
  {
    id: "properties",
    name: "Properties",
    description: "3 sample properties with details",
    icon: Home,
    count: 3,
  },
  {
    id: "customers",
    name: "Customers",
    description: "4 example customers with contact info",
    icon: Users,
    count: 4,
  },
  {
    id: "forms",
    name: "Forms",
    description: "2 pre-built form templates",
    icon: FileText,
    count: 2,
  },
];

export function SampleDataStep({
  includeSampleData,
  sampleDataTypes,
  onUpdate,
  onNext,
  onBack,
}: SampleDataStepProps) {
  const toggleSampleData = () => {
    onUpdate({ includeSampleData: !includeSampleData });
  };

  const toggleDataType = (typeId: string) => {
    const updated = sampleDataTypes.includes(typeId)
      ? sampleDataTypes.filter(id => id !== typeId)
      : [...sampleDataTypes, typeId];
    onUpdate({ sampleDataTypes: updated });
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Sample Data</h2>
        <p className="text-muted-foreground">
          Would you like us to add some example data to help you explore?
        </p>
      </div>

      {/* Enable/Disable Sample Data */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="include-sample-data" className="text-base font-semibold cursor-pointer">
                Include Sample Data
              </Label>
              <p className="text-sm text-muted-foreground">
                Add example work orders, properties, and customers to get started quickly.
                You can delete them anytime.
              </p>
            </div>
          </div>
          <Switch
            id="include-sample-data"
            checked={includeSampleData}
            onCheckedChange={toggleSampleData}
          />
        </div>
      </Card>

      {/* Sample Data Types */}
      {includeSampleData && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">What to Include</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SAMPLE_DATA_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = sampleDataTypes.includes(option.id);

              return (
                <Card
                  key={option.id}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => toggleDataType(option.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Label className="font-semibold cursor-pointer">
                        {option.name}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {option.count} {option.count === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!includeSampleData && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No sample data will be added. You'll start with a clean slate.</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
