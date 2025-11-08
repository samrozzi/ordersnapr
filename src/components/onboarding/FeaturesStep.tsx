import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  Home,
  FileText,
  Calendar,
  Users,
  Package,
  DollarSign,
  FolderOpen,
  ShoppingCart,
  BarChart3,
  Check,
} from "lucide-react";

interface FeaturesStepProps {
  selectedFeatures: string[];
  onUpdate: (features: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const AVAILABLE_FEATURES = [
  {
    id: "work_orders",
    name: "Work Orders",
    description: "Manage jobs, tasks, and service requests",
    icon: Briefcase,
    recommended: true,
  },
  {
    id: "properties",
    name: "Properties",
    description: "Track properties and locations",
    icon: Home,
    recommended: true,
  },
  {
    id: "forms",
    name: "Forms",
    description: "Create custom forms and templates",
    icon: FileText,
    recommended: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Schedule and view events",
    icon: Calendar,
    recommended: true,
  },
  {
    id: "invoicing",
    name: "Invoicing",
    description: "Create and manage invoices",
    icon: DollarSign,
    recommended: true,
  },
  {
    id: "customers",
    name: "Customers",
    description: "Manage customer relationships",
    icon: Users,
    recommended: false,
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Track parts and materials",
    icon: Package,
    recommended: false,
  },
  {
    id: "reports",
    name: "Reports",
    description: "Analytics and insights",
    icon: BarChart3,
    recommended: false,
  },
  {
    id: "files",
    name: "Files",
    description: "Document management",
    icon: FolderOpen,
    recommended: false,
  },
  {
    id: "pos",
    name: "Point of Sale",
    description: "In-person sales and transactions",
    icon: ShoppingCart,
    recommended: false,
  },
];

export function FeaturesStep({ selectedFeatures, onUpdate, onNext, onBack }: FeaturesStepProps) {
  const [features, setFeatures] = useState<string[]>(selectedFeatures);

  // Initialize with recommended features on first load
  useEffect(() => {
    if (selectedFeatures.length === 0) {
      const recommended = AVAILABLE_FEATURES
        .filter(f => f.recommended)
        .map(f => f.id);
      setFeatures(recommended);
      onUpdate(recommended);
    }
  }, []);

  const toggleFeature = (featureId: string) => {
    const updated = features.includes(featureId)
      ? features.filter(id => id !== featureId)
      : [...features, featureId];
    setFeatures(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Features</h2>
        <p className="text-muted-foreground">
          Select the modules you want to use. Don't worry, you can enable more later!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
        {AVAILABLE_FEATURES.map((feature) => {
          const Icon = feature.icon;
          const isSelected = features.includes(feature.id);

          return (
            <Card
              key={feature.id}
              className={`p-4 cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "hover:border-primary/50"
              }`}
              onClick={() => toggleFeature(feature.id)}
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold cursor-pointer">
                      {feature.name}
                    </Label>
                    {feature.recommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="text-sm text-muted-foreground">
          {features.length} {features.length === 1 ? "feature" : "features"} selected
        </div>
        <Button onClick={onNext} disabled={features.length === 0}>
          Next
        </Button>
      </div>
    </div>
  );
}
