import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { PricingModal } from "./PricingModal";

interface FreeTierLimitModalProps {
  open: boolean;
  onClose: () => void;
  resource: "work_orders" | "properties" | "forms" | "calendar_events";
  limit: number;
}

const RESOURCE_LABELS = {
  work_orders: "Work Orders",
  properties: "Properties",
  forms: "Forms",
  calendar_events: "Calendar Events",
};

const RESOURCE_BENEFITS = {
  work_orders: [
    "Create unlimited work orders",
    "Advanced scheduling",
    "Team collaboration",
    "Custom workflows",
  ],
  properties: [
    "Manage unlimited properties",
    "Property history tracking",
    "Custom property fields",
    "Bulk import",
  ],
  forms: [
    "Create unlimited custom forms",
    "Advanced field types",
    "Conditional logic",
    "Form templates",
  ],
  calendar_events: [
    "Unlimited calendar events",
    "Recurring appointments",
    "Team calendars",
    "SMS reminders",
  ],
};

export function FreeTierLimitModal({
  open,
  onClose,
  resource,
  limit,
}: FreeTierLimitModalProps) {
  const [showPricing, setShowPricing] = useState(false);
  const resourceLabel = RESOURCE_LABELS[resource];
  const benefits = RESOURCE_BENEFITS[resource];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            🎉 You've Used All {limit} Free {resourceLabel}!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            You're exploring OrderSnapr with a free account. Ready to unlock unlimited access?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-primary/50 bg-primary/5">
            <Zap className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Loving OrderSnapr?</strong> Get admin approval or upgrade to create unlimited{" "}
              {resourceLabel.toLowerCase()} and access premium features.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="font-semibold text-sm">With a full account, you get:</p>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              onClick={() => {
                onClose();
                setShowPricing(true);
              }} 
              className="w-full" 
              size="lg"
            >
              View Pricing Plans
            </Button>
            <Button onClick={onClose} variant="ghost" className="w-full">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>

      <PricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </Dialog>
  );
}
