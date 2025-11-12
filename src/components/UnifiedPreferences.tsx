import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/use-user-preferences";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useUserOrgMemberships } from "@/hooks/use-org-memberships";
import { FeatureModule } from "@/hooks/use-features";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { PricingModal } from "@/components/PricingModal";
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
  Crown,
  Info,
  Plus,
  Sparkles,
  Sidebar as SidebarIcon,
  Lock,
  Unlock,
  Palette,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hexToHSL } from "@/lib/color-utils";

const AVAILABLE_FEATURES = [
  {
    id: "work_orders",
    name: "Work Orders",
    description: "Manage jobs, tasks, and service requests",
    icon: Briefcase,
    free: true,
  },
  {
    id: "properties",
    name: "Properties",
    description: "Track properties and locations",
    icon: Home,
    free: true,
  },
  {
    id: "forms",
    name: "Forms",
    description: "Create custom forms and templates",
    icon: FileText,
    free: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Schedule and view events",
    icon: Calendar,
    free: true,
  },
  {
    id: "invoicing",
    name: "Invoicing",
    description: "Create and manage invoices",
    icon: DollarSign,
    free: false,
  },
  {
    id: "customers",
    name: "Customers",
    description: "Manage customer relationships",
    icon: Users,
    free: false,
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Track parts and materials",
    icon: Package,
    free: false,
  },
  {
    id: "reports",
    name: "Reports",
    description: "Analytics and insights",
    icon: BarChart3,
    free: false,
  },
  {
    id: "files",
    name: "Files",
    description: "Document management",
    icon: FolderOpen,
    free: false,
  },
  {
    id: "pos",
    name: "Point of Sale",
    description: "In-person sales and transactions",
    icon: ShoppingCart,
    free: false,
  },
];

const BRAND_PRESET_COLORS = [
  { name: "Default", primary: "#000000", secondary: "#ffffff" },
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

export function UnifiedPreferences() {
  const { user } = useAuth();
  const { features, getFeatureConfig } = useFeatureContext();
  const { data: preferences, isLoading } = useUserPreferences(user?.id || null);
  const updatePreferences = useUpdateUserPreferences();
  const { toast } = useToast();
  const { hasPremiumAccess } = usePremiumAccess();
  const isPremium = hasPremiumAccess();
  const { activeOrgId } = useActiveOrg();
  const { data: orgMemberships } = useUserOrgMemberships(user?.id || null);
  
  // Check if user can edit branding (premium + either no org or is org admin)
  const canEditBranding = isPremium && (!activeOrgId || orgMemberships?.some(
    m => m.org_id === activeOrgId && (m.role === 'admin' || m.role === 'owner')
  ));
  
  // Sidebar preferences state
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [sidebarHasChanges, setSidebarHasChanges] = useState(false);
  
  // Quick Add preferences state
  const [quickAddEnabled, setQuickAddEnabled] = useState(true);
  const [selectedQuickAddItems, setSelectedQuickAddItems] = useState<FeatureModule[]>([]);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const initializedRef = useRef(false);
  const [featuresReady, setFeaturesReady] = useState(false);
  
  // Branding state (defaults to white/black for free users)
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(isPremium ? "#3b82f6" : "#ffffff");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState(isPremium ? "#8b5cf6" : "#000000");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandingHasChanges, setBrandingHasChanges] = useState(false);

  // Load sidebar preferences from localStorage
  useEffect(() => {
    if (user) {
      const savedFeatures = localStorage.getItem(`user_features_${user.id}`);
      if (savedFeatures) {
        try {
          setEnabledFeatures(JSON.parse(savedFeatures));
        } catch (e) {
          console.error("Error parsing user features:", e);
          // On error, set free tier defaults
          const defaults = AVAILABLE_FEATURES.filter((f) => f.free).map((f) => f.id);
          setEnabledFeatures(defaults);
        }
      } else {
        // No saved preferences - initialize with free tier defaults
        const defaults = AVAILABLE_FEATURES.filter((f) => f.free).map((f) => f.id);
        setEnabledFeatures(defaults);
      }
      setFeaturesReady(true);
    }
  }, [user]);

  // Load branding preferences from database (for premium users)
  useEffect(() => {
    const loadBranding = async () => {
      if (!user || !isPremium) {
        // Free users get black and white defaults
        setBrandPrimaryColor("#000000");
        setBrandSecondaryColor("#ffffff");
        setBrandLogoUrl("");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_data")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_data) {
        const data = profile.onboarding_data as any;
        setBrandPrimaryColor(data.primaryColor || "#000000");
        setBrandSecondaryColor(data.secondaryColor || "#ffffff");
        setBrandLogoUrl(data.logoUrl || "");
      } else {
        // Premium users start with default black/white until they customize
        setBrandPrimaryColor("#000000");
        setBrandSecondaryColor("#ffffff");
      }
    };

    loadBranding();
  }, [user, isPremium]);

  // Get user's enabled features for Quick Add (from org or localStorage)
  const userFeatureModules = enabledFeatures as FeatureModule[];

  // Initialize Quick Add preferences
  useEffect(() => {
    if (isLoading || !user) return;
    if (!featuresReady) return; // wait until sidebar features are loaded
    if (initializedRef.current) return;

    if (preferences) {
      // Hydrate from existing preferences, but filter to only enabled features
      const savedItems = (preferences.quick_add_items as FeatureModule[] || []);
      const validItems = savedItems.filter(item => userFeatureModules.includes(item));
      setQuickAddEnabled(preferences.quick_add_enabled ?? true);
      setSelectedQuickAddItems(validItems);
      initializedRef.current = true;
    } else if (userFeatureModules.length > 0) {
      // First time: seed defaults
      const defaults = hasPremiumAccess() 
        ? userFeatureModules.slice(0, 4) 
        : userFeatureModules.slice(0, 2);
      setQuickAddEnabled(true);
      setSelectedQuickAddItems(defaults);
      initializedRef.current = true;
    }
  }, [preferences, isLoading, user, hasPremiumAccess, userFeatureModules, featuresReady]);

  const toggleSidebarFeature = (featureId: string) => {
    setEnabledFeatures((prev) => {
      const updated = prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId];
      setSidebarHasChanges(true);
      return updated;
    });
  };

  const handleSaveSidebar = () => {
    if (user) {
      localStorage.setItem(`user_features_${user.id}`, JSON.stringify(enabledFeatures));

      // Dispatch custom event to update FeatureContext immediately
      window.dispatchEvent(new Event('userFeaturesUpdated'));

      toast({
        title: "Sidebar Preferences Saved",
        description: "Refreshing page to apply changes...",
        duration: 2000,
      });
      setSidebarHasChanges(false);

      // Reload page after brief delay to show toast
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  const handleResetSidebar = () => {
    // Reset to free tier defaults
    const defaults = AVAILABLE_FEATURES.filter((f) => f.free).map((f) => f.id);
    setEnabledFeatures(defaults);
    setSidebarHasChanges(true);
  };

  const applyBrandPreset = (preset: typeof BRAND_PRESET_COLORS[0]) => {
    if (!canEditBranding) return;
    setBrandPrimaryColor(preset.primary);
    setBrandSecondaryColor(preset.secondary);
    setBrandingHasChanges(true);
  };

  const handleSaveBranding = async () => {
    if (!user || !canEditBranding) return;

    try {
      // First get existing onboarding_data to preserve other fields
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("onboarding_data")
        .eq("id", user.id)
        .single();

      const existingData = (existingProfile?.onboarding_data as any) || {};

      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_data: {
            ...existingData,
            primaryColor: brandPrimaryColor,
            secondaryColor: brandSecondaryColor,
            logoUrl: brandLogoUrl,
          }
        })
        .eq("id", user.id);

      if (error) throw error;

      // Apply theme immediately
      const hsl = hexToHSL(brandPrimaryColor);
      document.documentElement.style.setProperty("--primary", hsl);
      localStorage.setItem("org_theme_color", hsl);

      const secondaryHsl = hexToHSL(brandSecondaryColor);
      document.documentElement.style.setProperty("--secondary-brand", secondaryHsl);
      localStorage.setItem("org_secondary_color", secondaryHsl);

      toast({
        title: "Branding Saved",
        description: "Your brand customization has been updated",
      });
      setBrandingHasChanges(false);
    } catch (error) {
      console.error("Failed to save branding:", error);
      toast({
        title: "Error",
        description: "Failed to save branding preferences",
        variant: "destructive",
      });
    }
  };

  const handleToggleQuickAddItem = (feature: FeatureModule) => {
    setSelectedQuickAddItems(prev => {
      if (prev.includes(feature)) {
        // Removing item
        return prev.filter(f => f !== feature);
      } else {
        // Adding item - check free tier limit
        if (!hasPremiumAccess() && prev.length >= 2) {
          toast({
            title: "Free Tier Limit",
            description: "Free accounts can only have 2 Quick Add items. Upgrade for unlimited access!",
            variant: "default",
          });
          return prev;
        }
        return [...prev, feature];
      }
    });
  };

  const handleSaveQuickAdd = async () => {
    if (!user) return;

    try {
      await updatePreferences.mutateAsync({
        userId: user.id,
        quickAddEnabled,
        quickAddItems: selectedQuickAddItems,
      });
      toast({
        title: "Quick Add Preferences Saved",
        description: "Your Quick Add button has been updated",
      });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save Quick Add preferences",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Branding Customization - Show for all, but lock for free users and non-admins */}
      <Card className={!isPremium || (activeOrgId && !canEditBranding) ? "relative overflow-hidden" : ""}>
        {!isPremium && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <Card className="max-w-md mx-4 shadow-lg border-2">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Crown className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Upgrade to Customize Your Brand</h3>
                    <p className="text-sm text-muted-foreground">
                      Free accounts use default black and white styling. Upgrade to unlock custom brand colors and logo.
                    </p>
                  </div>
                  <Button className="w-full">
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeOrgId && !canEditBranding && isPremium && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <Card className="max-w-md mx-4 shadow-lg border-2">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-destructive/10 p-3 rounded-full">
                      <Lock className="h-8 w-8 text-destructive" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Admin Access Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Only organization admins can customize brand colors and logo. Contact your organization admin to make changes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Make It Your Own
            {!isPremium && <Badge variant="secondary" className="gap-1"><Crown className="h-3 w-3" />Premium</Badge>}
            {activeOrgId && !canEditBranding && isPremium && <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" />Admin Only</Badge>}
          </CardTitle>
          <CardDescription>
            Customize OrderSnapr with your brand colors and logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Presets */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Color Presets</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {BRAND_PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyBrandPreset(preset)}
                  disabled={!canEditBranding}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    brandPrimaryColor === preset.primary
                      ? "border-primary shadow-md"
                      : "border-transparent hover:border-muted"
                  } ${!canEditBranding ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex gap-1 mb-1">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  <span className="text-xs font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colors Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-primary-color">Primary Color</Label>
                <div className="flex gap-2">
                  <div
                    className="w-12 h-10 rounded border"
                    style={{ backgroundColor: brandPrimaryColor }}
                  />
                  <Input
                    id="brand-primary-color"
                    type="color"
                    value={brandPrimaryColor}
                    onChange={(e) => {
                      setBrandPrimaryColor(e.target.value);
                      setBrandingHasChanges(true);
                    }}
                    disabled={!canEditBranding}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-secondary-color">Secondary Color</Label>
                <div className="flex gap-2">
                  <div
                    className="w-12 h-10 rounded border"
                    style={{ backgroundColor: brandSecondaryColor }}
                  />
                  <Input
                    id="brand-secondary-color"
                    type="color"
                    value={brandSecondaryColor}
                    onChange={(e) => {
                      setBrandSecondaryColor(e.target.value);
                      setBrandingHasChanges(true);
                    }}
                    disabled={!canEditBranding}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Logo Section */}
            <div className="space-y-4">
              <Label>Company Logo</Label>
              <Card className="p-4 border-2 border-dashed">
                <div className="text-center space-y-3">
                  {brandLogoUrl ? (
                    <div className="space-y-3">
                      <img
                        src={brandLogoUrl}
                        alt="Company logo"
                        className="max-h-24 mx-auto"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBrandLogoUrl("");
                          setBrandingHasChanges(true);
                        }}
                        disabled={!canEditBranding}
                      >
                        Remove Logo
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Upload your logo</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, or SVG up to 2MB
                        </p>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        className="cursor-pointer text-sm"
                        disabled={!canEditBranding}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const result = reader.result as string;
                              setBrandLogoUrl(result);
                              setBrandingHasChanges(true);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </>
                  )}
                </div>
              </Card>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <Card className="p-3" style={{ backgroundColor: brandPrimaryColor }}>
                  <div className="flex items-center gap-2">
                    {brandLogoUrl && (
                      <img src={brandLogoUrl} alt="Logo" className="h-6 object-contain" />
                    )}
                    <div className="text-white font-semibold text-sm">
                      Your Brand Here
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t">
            <Button onClick={handleSaveBranding} disabled={!brandingHasChanges || !canEditBranding}>
              Save Branding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sidebar Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SidebarIcon className="h-5 w-5" />
            Sidebar Navigation
          </CardTitle>
          <CardDescription>
            Choose which pages appear in your sidebar navigation. {!isPremium && (
              <span className="text-orange-600 dark:text-orange-400 font-medium block mt-1">
                Premium features will be locked until you upgrade your account or join/create an organization.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isEnabled = enabledFeatures.includes(feature.id);
              const isFeaturePremium = !feature.free;
              const hasAccess = hasPremiumAccess();

              return (
                <Card
                  key={feature.id}
                  className={`p-4 ${isEnabled ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          isEnabled
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="font-semibold cursor-pointer break-words">
                            {feature.name}
                          </Label>
                          <Badge 
                            variant={hasAccess ? "default" : "secondary"} 
                            className="gap-1 flex-shrink-0"
                          >
                            {hasAccess ? (
                              <>
                                <Unlock className="h-3 w-3" />
                                Unlocked
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Locked
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 break-words">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleSidebarFeature(feature.id)}
                      className="flex-shrink-0"
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleResetSidebar} disabled={!sidebarHasChanges}>
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground py-2">
                {enabledFeatures.length} {enabledFeatures.length === 1 ? "page" : "pages"} enabled
              </span>
              <Button onClick={handleSaveSidebar} disabled={!sidebarHasChanges}>
                Save Sidebar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Button Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Add Button
          </CardTitle>
          <CardDescription>
            Control which items appear in the Quick Add floating button
            {!isPremium && (
              <span className="text-orange-600 dark:text-orange-400 block mt-1">
                (Free tier: Maximum 2 items)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Quick Add */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="flex-1">
              <Label htmlFor="quick-add-enabled" className="text-base font-medium">
                Show Quick Add Button
              </Label>
              <p className="text-sm text-muted-foreground">
                Display the floating "+" button in the bottom-right corner
              </p>
            </div>
            <Switch
              id="quick-add-enabled"
              checked={quickAddEnabled}
              onCheckedChange={setQuickAddEnabled}
            />
          </div>

          {/* Feature Selection */}
          {quickAddEnabled && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Items to Show</Label>
              <p className="text-sm text-muted-foreground">
                Choose which features appear in the Quick Add menu (based on your sidebar selection)
              </p>

              {userFeatureModules.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No features enabled</AlertTitle>
                  <AlertDescription>
                    Enable features in the Sidebar Navigation section above to add them to Quick Add.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {userFeatureModules.map(featureModule => {
                    const config = getFeatureConfig(featureModule);
                    const featureData = AVAILABLE_FEATURES.find(f => f.id === featureModule);
                    const Icon = featureData?.icon || Plus;
                    const label = config?.display_name || featureData?.name || featureModule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <div
                        key={featureModule}
                        className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                      >
                        <Switch
                          id={`feature-${featureModule}`}
                          checked={selectedQuickAddItems.includes(featureModule)}
                          onCheckedChange={() => handleToggleQuickAddItem(featureModule)}
                        />
                        <Label
                          htmlFor={`feature-${featureModule}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isPremium && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Free Tier Limit</AlertTitle>
                  <AlertDescription>
                    Free accounts can only have 2 Quick Add items. Upgrade for unlimited access!
                  </AlertDescription>
                </Alert>
              )}
              
              {selectedQuickAddItems.length === 0 && quickAddEnabled && (
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Warning: You must select at least one item, or the Quick Add button will not appear.
                </p>
              )}
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSaveQuickAdd}
            disabled={updatePreferences.isPending}
            className="w-full"
          >
            {updatePreferences.isPending ? "Saving..." : "Save Quick Add"}
          </Button>
        </CardContent>
      </Card>

      {/* Upgrade Prompt */}
      {!isPremium && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Unlock Premium Features
            </CardTitle>
            <CardDescription>
              You're currently on a free account with limited access. Premium features in your sidebar
              will be locked until you upgrade your account or join/create an organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Free tier includes: Work Orders (3), Properties (2), Forms (2), Calendar (5 events)
            </p>
            <Button onClick={() => setShowPricingModal(true)}>
              View Upgrade Options
            </Button>
          </CardContent>
        </Card>
      )}

      <PricingModal open={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
}
