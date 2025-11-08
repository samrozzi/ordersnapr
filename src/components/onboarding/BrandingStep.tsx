import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Palette, Upload } from "lucide-react";

interface BrandingStepProps {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  onUpdate: (branding: { primaryColor?: string; secondaryColor?: string; logoUrl?: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

const PRESET_COLORS = [
  { name: "Blue", primary: "#3b82f6", secondary: "#8b5cf6" },
  { name: "Green", primary: "#10b981", secondary: "#14b8a6" },
  { name: "Orange", primary: "#f97316", secondary: "#f59e0b" },
  { name: "Pink", primary: "#ec4899", secondary: "#a855f7" },
  { name: "Indigo", primary: "#6366f1", secondary: "#8b5cf6" },
  { name: "Red", primary: "#ef4444", secondary: "#f97316" },
];

export function BrandingStep({
  primaryColor,
  secondaryColor,
  logoUrl,
  onUpdate,
  onNext,
  onBack,
}: BrandingStepProps) {
  const [localPrimary, setLocalPrimary] = useState(primaryColor);
  const [localSecondary, setLocalSecondary] = useState(secondaryColor);
  const [localLogo, setLocalLogo] = useState(logoUrl);

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setLocalPrimary(preset.primary);
    setLocalSecondary(preset.secondary);
    onUpdate({ primaryColor: preset.primary, secondaryColor: preset.secondary });
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Customize Your Brand</h2>
        <p className="text-muted-foreground">
          Make OrderSnapr look and feel like your own with custom colors and logo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Color Presets */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Color Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  localPrimary === preset.primary
                    ? "border-primary shadow-md"
                    : "border-transparent hover:border-muted"
                }`}
              >
                <div className="flex gap-1 mb-2">
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: preset.secondary }}
                  />
                </div>
                <span className="text-xs font-medium">{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Colors */}
          <div className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <div
                  className="w-12 h-10 rounded border"
                  style={{ backgroundColor: localPrimary }}
                />
                <Input
                  id="primary-color"
                  type="color"
                  value={localPrimary}
                  onChange={(e) => {
                    setLocalPrimary(e.target.value);
                    onUpdate({ primaryColor: e.target.value });
                  }}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <div
                  className="w-12 h-10 rounded border"
                  style={{ backgroundColor: localSecondary }}
                />
                <Input
                  id="secondary-color"
                  type="color"
                  value={localSecondary}
                  onChange={(e) => {
                    setLocalSecondary(e.target.value);
                    onUpdate({ secondaryColor: e.target.value });
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo Upload & Preview */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Company Logo (Optional)</Label>
          <Card className="p-6 border-2 border-dashed">
            <div className="text-center space-y-4">
              {localLogo ? (
                <div className="space-y-4">
                  <img
                    src={localLogo}
                    alt="Company logo"
                    className="max-h-32 mx-auto"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocalLogo("");
                      onUpdate({ logoUrl: "" });
                    }}
                  >
                    Remove Logo
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Upload your logo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or SVG up to 2MB
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const result = reader.result as string;
                          setLocalLogo(result);
                          onUpdate({ logoUrl: result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can also skip this and add it later
                  </p>
                </>
              )}
            </div>
          </Card>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <Card className="p-4" style={{ backgroundColor: localPrimary }}>
              <div className="flex items-center gap-3">
                {localLogo && (
                  <img src={localLogo} alt="Logo" className="h-8 object-contain" />
                )}
                <div className="text-white font-semibold">
                  Your Brand Here
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

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
