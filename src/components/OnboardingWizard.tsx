import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Rocket } from "lucide-react";
import { WelcomeStep } from "./onboarding/WelcomeStep";
import { FeaturesStep } from "./onboarding/FeaturesStep";
import { BrandingStep } from "./onboarding/BrandingStep";
import { SampleDataStep } from "./onboarding/SampleDataStep";
import { CompletionStep } from "./onboarding/CompletionStep";

export interface OnboardingData {
  selectedFeatures: string[];
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  includeSampleData: boolean;
  sampleDataTypes: string[];
}

const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome", description: "Get started with OrderSnapr" },
  { id: "features", title: "Features", description: "Choose your modules" },
  { id: "branding", title: "Branding", description: "Customize your look" },
  { id: "sample-data", title: "Sample Data", description: "Optional example data" },
  { id: "complete", title: "All Set!", description: "You're ready to go" },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    selectedFeatures: [],
    primaryColor: "#3b82f6",
    secondaryColor: "#8b5cf6",
    logoUrl: "",
    includeSampleData: true,
    sampleDataTypes: ["work_orders", "properties", "customers"],
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) {
      navigate("/free-workspace");
      return;
    }

    try {
      // Save onboarding completion and data to database
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_data: {
            selectedFeatures: onboardingData.selectedFeatures,
            primaryColor: onboardingData.primaryColor,
            secondaryColor: onboardingData.secondaryColor,
            logoUrl: onboardingData.logoUrl,
            includeSampleData: onboardingData.includeSampleData,
            sampleDataTypes: onboardingData.sampleDataTypes,
            completedAt: new Date().toISOString(),
          },
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving onboarding data:", error);
        // Fall back to localStorage on error
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
        if (onboardingData.selectedFeatures.length > 0) {
          localStorage.setItem(
            `user_features_${user.id}`,
            JSON.stringify(onboardingData.selectedFeatures)
          );
        }
      } else {
        // Also set localStorage on success for sync
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
        if (onboardingData.selectedFeatures.length > 0) {
          localStorage.setItem(
            `user_features_${user.id}`,
            JSON.stringify(onboardingData.selectedFeatures)
          );
        }
      }

      // Get user's profile to check approval status
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, organization_id")
        .eq("id", user.id)
        .single();

      // Free tier users (no organization) should be auto-approved and go to free workspace
      // Organization users go to dashboard if approved, otherwise pending approval
      if (profile?.organization_id) {
        // User is part of an organization
        if (profile.approval_status === "approved") {
          navigate("/dashboard");
        } else {
          navigate("/pending-approval");
        }
      } else {
        // Free tier user - go to dashboard and mark workspace as seen
        if (user?.id) {
          localStorage.setItem(`free_workspace_seen_${user.id}`, "true");
        }
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error in handleComplete:", error);
      navigate("/free-workspace");
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} />;
      case 1:
        return (
          <FeaturesStep
            selectedFeatures={onboardingData.selectedFeatures}
            onUpdate={(features) => updateData({ selectedFeatures: features })}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <BrandingStep
            primaryColor={onboardingData.primaryColor}
            secondaryColor={onboardingData.secondaryColor}
            logoUrl={onboardingData.logoUrl}
            onUpdate={(branding) => updateData(branding)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <SampleDataStep
            includeSampleData={onboardingData.includeSampleData}
            sampleDataTypes={onboardingData.sampleDataTypes}
            onUpdate={(data) => updateData(data)}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <CompletionStep
            onboardingData={onboardingData}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Setup Wizard</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {ONBOARDING_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-1 ${
                    index === currentStep ? "text-primary font-medium" : ""
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : index === currentStep ? (
                    <Circle className="h-4 w-4 fill-primary text-primary" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-[400px]">
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}
