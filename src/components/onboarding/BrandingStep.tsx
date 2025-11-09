import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Upload, Lock, Crown, Sparkles } from "lucide-react";
import { usePremiumAccess } from "@/hooks/use-premium-access";

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
  { name: "Purple", primary: "#a855f7", secondary: "#ec4899" },
  { name: "Teal", primary: "#14b8a6", secondary: "#06b6d4" },
  { name: "Amber", primary: "#f59e0b", secondary: "#eab308" },
];

export function BrandingStep({
  primaryColor,
  secondaryColor,
  logoUrl,
  onUpdate,
  onNext,
  onBack,
}: BrandingStepProps) {
  const { hasPremiumAccess } = usePremiumAccess();
  const isPremium = hasPremiumAccess();
  // Free users default to black/white, premium users can customize
  const [localPrimary, setLocalPrimary] = useState(isPremium ? primaryColor : "#000000");
  const [localSecondary, setLocalSecondary] = useState(isPremium ? secondaryColor : "#ffffff");
  const [localLogo, setLocalLogo] = useState(isPremium ? logoUrl : "");

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setLocalPrimary(preset.primary);
    setLocalSecondary(preset.secondary);
    onUpdate({ primaryColor: preset.primary, secondaryColor: preset.secondary });
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold">
            {isPremium ? "Customize Your Brand" : "Unlock Premium Branding"}
          </h2>
          {!isPremium && (
            <Badge variant="secondary" className="gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {isPremium 
            ? "Make OrderSnapr look and feel like your own with custom colors and logo"
            : "Upgrade to customize OrderSnapr with your brand colors and logo"
          }
        </p>
      </div>

      {!isPremium && (
        <Card className="p-4 border-2 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold flex items-center gap-2">
                Preview Premium Features
                <Crown className="h-4 w-4 text-primary" />
              </p>
              <p className="text-sm text-muted-foreground">
                Free accounts use default black and white styling. Upgrade to unlock custom brand colors and logo - you can customize these in Preferences after upgrading!
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Color Presets */}
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            Color Presets
            {!isPremium && <Lock className="h-4 w-4 text-muted-foreground" />}
          </Label>
          <div className="grid grid-cols-3 gap-2 relative">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => isPremium && applyPreset(preset)}
                disabled={!isPremium}
                className={`p-3 rounded-lg border-2 transition-all ${
                  localPrimary === preset.primary
                    ? "border-primary shadow-md"
                    : "border-transparent hover:border-muted"
                } ${!isPremium ? "opacity-60 cursor-not-allowed" : ""}`}
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
              <Label htmlFor="primary-color" className="flex items-center gap-2">
                Primary Color
                {!isPremium && <Lock className="h-4 w-4 text-muted-foreground" />}
              </Label>
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
                    if (isPremium) {
                      setLocalPrimary(e.target.value);
                      onUpdate({ primaryColor: e.target.value });
                    }
                  }}
                  disabled={!isPremium}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="flex items-center gap-2">
                Secondary Color
                {!isPremium && <Lock className="h-4 w-4 text-muted-foreground" />}
              </Label>
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
                    if (isPremium) {
                      setLocalSecondary(e.target.value);
                      onUpdate({ secondaryColor: e.target.value });
                    }
                  }}
                  disabled={!isPremium}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo Upload & Preview */}
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            Company Logo (Optional)
            {!isPremium && <Lock className="h-4 w-4 text-muted-foreground" />}
          </Label>
          <Card className={`p-6 border-2 border-dashed ${!isPremium ? "opacity-60" : ""}`}>
            <div className="text-center space-y-4">
              {localLogo && isPremium ? (
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
                    disabled={!isPremium}
                    onChange={(e) => {
                      if (!isPremium) return;
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
                    {isPremium 
                      ? "You can also skip this and add it later"
                      : "Available after upgrade - customize in Preferences"
                    }
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
          {isPremium ? "Next" : "Continue with Defaults"}
        </Button>
      </div>
    </div>
  );
}
