import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

export interface TutorialStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface TutorialTooltipProps {
  tutorialId: string;
  steps: TutorialStep[];
  onComplete?: () => void;
}

export function TutorialTooltip({ tutorialId, steps, onComplete }: TutorialTooltipProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const storageKey = `tutorial_${tutorialId}_${user?.id}`;

  useEffect(() => {
    // Check if user has completed this tutorial
    const completed = localStorage.getItem(storageKey);
    if (!completed && steps.length > 0) {
      // Start tutorial after a brief delay
      setTimeout(() => {
        setIsActive(true);
        updatePosition();
      }, 1000);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
      };
    }
  }, [isActive, currentStep]);

  const updatePosition = () => {
    const step = steps[currentStep];
    if (!step) return;

    const targetElement = document.querySelector(step.target);
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const placement = step.placement || "bottom";

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = rect.top - 10;
        left = rect.left + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - 10;
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + 10;
        break;
    }

    setPosition({ top, left });

    // Highlight the target element
    targetElement.classList.add("tutorial-highlight");
  };

  const handleNext = () => {
    // Remove highlight from current element
    const currentTarget = document.querySelector(steps[currentStep].target);
    currentTarget?.classList.remove("tutorial-highlight");

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // Remove highlight from current element
      const currentTarget = document.querySelector(steps[currentStep].target);
      currentTarget?.classList.remove("tutorial-highlight");

      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const completeTutorial = () => {
    localStorage.setItem(storageKey, "completed");
    // Remove highlight from last element
    const currentTarget = document.querySelector(steps[currentStep].target);
    currentTarget?.classList.remove("tutorial-highlight");
    setIsActive(false);
    onComplete?.();
  };

  if (!isActive || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const placement = step.placement || "bottom";

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40 pointer-events-none" />

      {/* Tooltip */}
      <Card
        ref={tooltipRef}
        className="fixed z-50 p-4 max-w-sm shadow-2xl"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform:
            placement === "bottom"
              ? "translateX(-50%)"
              : placement === "top"
              ? "translateX(-50%) translateY(-100%)"
              : placement === "left"
              ? "translateX(-100%) translateY(-50%)"
              : "translateY(-50%)",
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-sm">{step.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{step.content}</p>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {currentStep + 1} of {steps.length}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                "Finish"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Add global CSS for highlight effect */}
      <style>
        {`
          .tutorial-highlight {
            position: relative;
            z-index: 41 !important;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5) !important;
            border-radius: 4px;
          }
        `}
      </style>
    </>
  );
}
