import { useState } from "react";
import { Droplet, Plus, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWaterTracker } from "@/hooks/use-water-tracker";
import { cn } from "@/lib/utils";

interface WaterTrackerWidgetProps {
  size: "S" | "M" | "L";
}

export const WaterTrackerWidget = ({ size }: WaterTrackerWidgetProps) => {
  const { todayIntake, isLoading, updateIntake, isUpdating } = useWaterTracker();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customGoal, setCustomGoal] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ozConsumed = todayIntake?.oz_consumed || 0;
  const dailyGoal = todayIntake?.daily_goal || 64;
  const percentage = Math.min((ozConsumed / dailyGoal) * 100, 100);
  const isGoalReached = percentage >= 100;

  const addWater = (oz: number) => {
    updateIntake({ ozToAdd: oz });
  };

  const addCustomAmount = () => {
    const amount = parseInt(customAmount);
    if (amount > 0 && amount <= 64) {
      addWater(amount);
      setCustomAmount("");
    }
  };

  const setGoal = () => {
    const goal = parseInt(customGoal);
    if (goal > 0 && goal <= 500) {
      updateIntake({ newGoal: goal });
      setSettingsOpen(false);
    }
  };

  const getColor = () => {
    if (isGoalReached) return "hsl(var(--success))";
    if (percentage >= 75) return "hsl(210, 100%, 50%)";
    if (percentage >= 50) return "hsl(200, 100%, 60%)";
    if (percentage >= 25) return "hsl(50, 100%, 50%)";
    return "hsl(0, 70%, 60%)";
  };

  return (
    <div className="h-full flex flex-col items-center justify-between p-4 relative">
      <div className="absolute top-2 right-2">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Daily Water Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Custom Goal (oz)</Label>
                <Input
                  type="number"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder={dailyGoal.toString()}
                  min="1"
                  max="500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[48, 64, 80, 96, 128].map((goal) => (
                  <Button
                    key={goal}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateIntake({ newGoal: goal });
                      setSettingsOpen(false);
                    }}
                  >
                    {goal} oz
                  </Button>
                ))}
              </div>
              <Button onClick={setGoal} className="w-full">
                Set Custom Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <svg width="120" height="180" viewBox="0 0 120 180" className="drop-shadow-lg">
          {/* Bottle outline */}
          <path
            d="M 40 20 L 40 10 Q 40 5 45 5 L 75 5 Q 80 5 80 10 L 80 20 Q 85 25 85 35 L 85 160 Q 85 170 75 170 L 45 170 Q 35 170 35 160 L 35 35 Q 35 25 40 20 Z"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2"
          />
          
          {/* Water fill */}
          <defs>
            <clipPath id="bottle-clip">
              <path d="M 40 20 L 40 10 Q 40 5 45 5 L 75 5 Q 80 5 80 10 L 80 20 Q 85 25 85 35 L 85 160 Q 85 170 75 170 L 45 170 Q 35 170 35 160 L 35 35 Q 35 25 40 20 Z" />
            </clipPath>
            <linearGradient id="water-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" style={{ stopColor: getColor(), stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: getColor(), stopOpacity: 0.4 }} />
            </linearGradient>
          </defs>
          
          <rect
            x="35"
            y={170 - (percentage / 100) * 150}
            width="50"
            height={(percentage / 100) * 150}
            fill="url(#water-gradient)"
            clipPath="url(#bottle-clip)"
            className="transition-all duration-500"
          />
          
          {/* Wave effect */}
          {percentage > 0 && (
            <path
              d={`M 35 ${170 - (percentage / 100) * 150} Q 47.5 ${170 - (percentage / 100) * 150 - 3} 60 ${170 - (percentage / 100) * 150} T 85 ${170 - (percentage / 100) * 150}`}
              fill="none"
              stroke={getColor()}
              strokeWidth="2"
              opacity="0.6"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Percentage ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl"
            style={{
              background: `conic-gradient(${getColor()} ${percentage * 3.6}deg, hsl(var(--muted)) ${percentage * 3.6}deg)`,
              padding: "4px",
            }}
          >
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <span style={{ color: getColor() }}>{Math.round(percentage)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: getColor() }}>
            {ozConsumed} oz
          </p>
          <p className="text-sm text-muted-foreground">of {dailyGoal} oz goal</p>
        </div>

        {size !== "S" && (
          <>
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addWater(8)}
                disabled={isUpdating}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                8oz
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addWater(16)}
                disabled={isUpdating}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                16oz
              </Button>
              {size === "L" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addWater(32)}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  32oz
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Custom oz"
                min="1"
                max="64"
                className="flex-1 h-9"
              />
              <Button
                size="sm"
                onClick={addCustomAmount}
                disabled={isUpdating || !customAmount}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </>
        )}

        {size === "S" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => addWater(8)}
            disabled={isUpdating}
            className="w-full"
          >
            <Droplet className="h-4 w-4 mr-2" />
            Add 8oz
          </Button>
        )}

        {isGoalReached && (
          <div className="text-center text-sm font-semibold animate-pulse" style={{ color: getColor() }}>
            🎉 Goal Reached!
          </div>
        )}
      </div>
    </div>
  );
};
