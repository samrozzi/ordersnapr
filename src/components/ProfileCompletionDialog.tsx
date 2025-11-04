import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileCompletionDialogProps {
  open: boolean;
  userId: string;
  onComplete: () => void;
}

export function ProfileCompletionDialog({ open, userId, onComplete }: ProfileCompletionDialogProps) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Your profile has been set up successfully",
      });

      onComplete();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to OrderSnapr! 👋</DialogTitle>
          <DialogDescription>
            Let's complete your profile to get started
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">What's your name?</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Setting up..." : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
