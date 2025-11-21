import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const MIGRATION_SQL = `-- Free Tier Migration: Support users without organizations
-- Run this in Supabase Dashboard → SQL Editor → New Query

-- 1. Make organization_id nullable for work_orders
ALTER TABLE public.work_orders ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Make org_id nullable for form_submissions
ALTER TABLE public.form_submissions ALTER COLUMN org_id DROP NOT NULL;

-- 3. Make organization_id nullable for calendar_events (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'calendar_events'
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.calendar_events ALTER COLUMN organization_id DROP NOT NULL;
    END IF;
END $$;

-- 4. Drop existing work_orders RLS policies
DROP POLICY IF EXISTS "Users can view work orders in their organization" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create work orders in their organization" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update work orders in their organization" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete work orders in their organization" ON public.work_orders;

-- 5. Create new work_orders RLS policies supporting free tier
CREATE POLICY "Users can view own work orders"
ON public.work_orders
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

CREATE POLICY "Users can create work orders"
ON public.work_orders
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    organization_id IS NULL
    OR (
      organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      AND is_user_approved(auth.uid())
    )
  )
);

CREATE POLICY "Users can update own work orders"
ON public.work_orders
FOR UPDATE
USING (
  user_id = auth.uid()
  OR (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

CREATE POLICY "Users can delete own work orders"
ON public.work_orders
FOR DELETE
USING (
  user_id = auth.uid()
  OR (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

-- 6. Update properties RLS policies
DROP POLICY IF EXISTS "Users can view properties in their organization" ON public.properties;
DROP POLICY IF EXISTS "Users can create properties in their organization" ON public.properties;
DROP POLICY IF EXISTS "Users can update properties in their organization" ON public.properties;
DROP POLICY IF EXISTS "Users can delete properties in their organization" ON public.properties;

CREATE POLICY "Users can view own properties"
ON public.properties
FOR SELECT
USING (
  created_by = auth.uid()
  OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can create properties"
ON public.properties
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "Users can update own properties"
ON public.properties
FOR UPDATE
USING (
  created_by = auth.uid()
  OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own properties"
ON public.properties
FOR DELETE
USING (
  created_by = auth.uid()
  OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- 7. Update form_templates RLS policies
DROP POLICY IF EXISTS "Users can view templates in their organization" ON public.form_templates;
DROP POLICY IF EXISTS "Users can create templates in their organization" ON public.form_templates;

CREATE POLICY "Users can view form templates"
ON public.form_templates
FOR SELECT
USING (
  is_global = true
  OR created_by = auth.uid()
  OR org_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can create form templates"
ON public.form_templates
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

-- 8. Update form_submissions RLS policies
DROP POLICY IF EXISTS "Users can view submissions in their organization" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can create submissions in their organization" ON public.form_submissions;

CREATE POLICY "Users can view own form submissions"
ON public.form_submissions
FOR SELECT
USING (
  submitted_by = auth.uid()
  OR org_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can create form submissions"
ON public.form_submissions
FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
);

-- 9. Update calendar_events RLS policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        DROP POLICY IF EXISTS "Users can view events in their organization" ON public.calendar_events;
        DROP POLICY IF EXISTS "Users can create events in their organization" ON public.calendar_events;
        DROP POLICY IF EXISTS "Users can update events in their organization" ON public.calendar_events;
        DROP POLICY IF EXISTS "Users can delete events in their organization" ON public.calendar_events;

        EXECUTE 'CREATE POLICY "Users can view own calendar events"
        ON public.calendar_events
        FOR SELECT
        USING (
          user_id = auth.uid()
          OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )';

        EXECUTE 'CREATE POLICY "Users can create calendar events"
        ON public.calendar_events
        FOR INSERT
        WITH CHECK (
          user_id = auth.uid()
        )';

        EXECUTE 'CREATE POLICY "Users can update own calendar events"
        ON public.calendar_events
        FOR UPDATE
        USING (
          user_id = auth.uid()
          OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )';

        EXECUTE 'CREATE POLICY "Users can delete own calendar events"
        ON public.calendar_events
        FOR DELETE
        USING (
          user_id = auth.uid()
          OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )';
    END IF;
END $$;`;

export function MigrationChecker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [checking, setChecking] = useState(true);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  useEffect(() => {
    const checkMigration = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      // Only check once per session
      const checkedKey = `migration_checked_${user.id}`;
      if (sessionStorage.getItem(checkedKey)) {
        setChecking(false);
        return;
      }

      try {
        // Check if we can query with null org_id filter (non-destructive test)
        const { error: queryError } = await supabase
          .from("work_orders")
          .select("id")
          .is("organization_id", null)
          .limit(1);

        if (queryError && (queryError.code === "42501" || queryError.message?.includes("policy"))) {
          setMigrationNeeded(true);
          setShowModal(true);
        }

        sessionStorage.setItem(checkedKey, "true");
      } catch (err) {
        console.error("Error checking migration:", err);
      } finally {
        setChecking(false);
      }
    };

    checkMigration();
  }, [user]);

  const copySQL = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    toast({
      title: "Copied!",
      description: "Migration SQL copied to clipboard",
    });
  };

  const openSupabase = () => {
    window.open("https://supabase.com/dashboard", "_blank");
  };

  const dismissUntilNextSession = () => {
    setShowModal(false);
  };

  if (checking || !migrationNeeded) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Database Migration Required
          </DialogTitle>
          <DialogDescription>
            Free tier features won't work until you apply this migration to your Supabase database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What's happening?</strong> The code has been deployed, but the database schema
              changes haven't been applied yet. This is a one-time setup step.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Quick Setup (2 minutes):</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Copy SQL" below to copy the migration code</li>
              <li>Click "Open Supabase Dashboard" to open your Supabase project</li>
              <li>Navigate to SQL Editor in the left sidebar</li>
              <li>Click "New Query"</li>
              <li>Paste the SQL and click "Run"</li>
              <li>Refresh this page - you're done!</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button onClick={copySQL} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy SQL
            </Button>
            <Button onClick={openSupabase} variant="outline" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Supabase Dashboard
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Migration SQL Preview:</h4>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <pre className="text-xs font-mono">{MIGRATION_SQL}</pre>
            </ScrollArea>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="ghost" size="sm" onClick={dismissUntilNextSession}>
              I'll do this later
            </Button>
            <p className="text-xs text-muted-foreground">
              This check runs once per session
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
