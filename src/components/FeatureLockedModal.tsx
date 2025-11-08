import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap } from "lucide-react";

interface FeatureLockedModalProps {
  open: boolean;
  onClose: () => void;
  featureName?: string;
  message?: string;
  onUpgrade?: () => void;
}

// Minimal line art character SVG - whimsical style
const WhimsicalCharacter = () => (
  <svg
    width="120"
    height="140"
    viewBox="0 0 120 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mx-auto mb-4"
  >
    {/* Head */}
    <circle cx="60" cy="40" r="25" stroke="currentColor" strokeWidth="2.5" fill="none" />

    {/* Eyes */}
    <circle cx="52" cy="37" r="3" fill="currentColor" />
    <circle cx="68" cy="37" r="3" fill="currentColor" />

    {/* Smile */}
    <path
      d="M 50 45 Q 60 50 70 45"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />

    {/* Body */}
    <path
      d="M 60 65 L 60 100"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />

    {/* Arms - waving hand */}
    <path
      d="M 60 75 L 35 70"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M 60 75 L 85 65"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />

    {/* Hand wave lines */}
    <path
      d="M 87 63 Q 92 60 95 62"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M 90 58 Q 95 55 98 57"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.5"
    />

    {/* Legs */}
    <path
      d="M 60 100 L 45 130"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M 60 100 L 75 130"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const WHIMSICAL_MESSAGES = [
  "Whoa there, partner! 🤠",
  "Not so fast, friend! 👋",
  "Hold up a sec! ✋",
  "Slow down there! 🐌",
  "Oops! Almost got ahead of yourself! 😊",
];

export function FeatureLockedModal({
  open,
  onClose,
  featureName = "this feature",
  message,
  onUpgrade,
}: FeatureLockedModalProps) {
  const navigate = useNavigate();

  // Pick a random whimsical greeting
  const greeting = WHIMSICAL_MESSAGES[Math.floor(Math.random() * WHIMSICAL_MESSAGES.length)];

  const defaultMessage = message || `You're using a free account, which doesn't include access to ${featureName}.`;

  const handleUpgradeClick = () => {
    onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default behavior: navigate to profile preferences
      navigate("/profile?tab=preferences");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          <div className="text-primary">
            <WhimsicalCharacter />
          </div>

          <DialogTitle className="text-center text-2xl font-bold">
            {greeting}
          </DialogTitle>

          <DialogDescription className="text-center text-base pt-2 space-y-3">
            <p className="text-foreground font-medium">{defaultMessage}</p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-foreground">Unlock premium features</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-foreground">Get unlimited access</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-4">
          <Button
            onClick={handleUpgradeClick}
            className="w-full"
            size="lg"
          >
            Upgrade to Unlock
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Maybe Later
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Contact your admin or request access to get started!
        </p>
      </DialogContent>
    </Dialog>
  );
}
