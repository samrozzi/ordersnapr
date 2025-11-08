import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Rocket, Loader2 } from "lucide-react";
import { OnboardingData } from "../OnboardingWizard";
import { generateSampleData } from "@/lib/sample-data-generator";
import { useToast } from "@/hooks/use-toast";

interface CompletionStepProps {
  onboardingData: OnboardingData;
  onComplete: () => void;
}

export function CompletionStep({ onboardingData, onComplete }: CompletionStepProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const applySettings = async () => {
    setIsApplying(true);
    setProgress(10);
    setCurrentTask("Saving features...");

    try {
      // Simulate applying settings with progress updates
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(30);
      setCurrentTask("Applying branding...");

      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(50);
      setCurrentTask("Configuring modules...");

      // Generate sample data if requested
      if (onboardingData.includeSampleData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(70);
        setCurrentTask("Generating sample data...");

        await generateSampleData(onboardingData.sampleDataTypes);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(100);
      setCurrentTask("All set!");

      setIsComplete(true);

      toast({
        title: "Setup Complete!",
        description: "Your workspace is ready to use.",
      });

      // Auto-complete after a moment
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Setup Error",
        description: error.message || "Failed to complete setup",
        variant: "destructive",
      });
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-8 py-6">
      {!isApplying && !isComplete && (
        <>
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-3xl font-bold">You're All Set!</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Review your choices below and click "Complete Setup" when you're ready.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold">Features Enabled</h3>
              <p className="text-sm text-muted-foreground">
                {onboardingData.selectedFeatures.length} modules selected
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {onboardingData.selectedFeatures.map(feature => (
                  <span
                    key={feature}
                    className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium"
                  >
                    {feature.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold">Branding</h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: onboardingData.primaryColor }}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: onboardingData.secondaryColor }}
                  />
                </div>
                {onboardingData.logoUrl && (
                  <span className="text-sm text-muted-foreground">
                    + Custom logo uploaded
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold">Sample Data</h3>
              <p className="text-sm text-muted-foreground">
                {onboardingData.includeSampleData
                  ? `${onboardingData.sampleDataTypes.length} sample data types will be created`
                  : "Starting with a clean slate"}
              </p>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button onClick={applySettings} size="lg" className="min-w-[200px]">
              <Rocket className="mr-2 h-5 w-5" />
              Complete Setup
            </Button>
          </div>
        </>
      )}

      {isApplying && (
        <div className="text-center space-y-6 py-12">
          {isComplete ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4 animate-bounce">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold">Setup Complete!</h3>
              <p className="text-muted-foreground">Taking you to your dashboard...</p>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{currentTask}</h3>
                <Progress value={progress} className="w-64 mx-auto" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
