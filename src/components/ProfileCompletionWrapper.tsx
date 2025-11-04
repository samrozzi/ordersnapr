import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCompletionDialog } from "./ProfileCompletionDialog";

interface ProfileCompletionWrapperProps {
  children: React.ReactNode;
}

export function ProfileCompletionWrapper({ children }: ProfileCompletionWrapperProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile && !profile.full_name) {
        setUserId(user.id);
        setShowDialog(true);
      }
    };

    checkProfileCompletion();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(() => {
          checkProfileCompletion();
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {children}
      {userId && (
        <ProfileCompletionDialog
          open={showDialog}
          userId={userId}
          onComplete={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
