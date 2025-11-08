import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Palette } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-8 py-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Welcome to OrderSnapr!</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Let's get you set up in just a few minutes. We'll help you customize your workspace,
          choose the features you need, and get you ready to manage your business.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold">Quick Setup</h3>
          <p className="text-sm text-muted-foreground">
            Choose only the features you need - you can always add more later
          </p>
        </div>

        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20">
            <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold">Custom Branding</h3>
          <p className="text-sm text-muted-foreground">
            Make it yours with custom colors and your logo
          </p>
        </div>

        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20">
            <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold">Sample Data</h3>
          <p className="text-sm text-muted-foreground">
            Optional example data to help you explore the platform
          </p>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <Button onClick={onNext} size="lg" className="min-w-[200px]">
          Let's Get Started
        </Button>
      </div>
    </div>
  );
}
