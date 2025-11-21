import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function MigrationStatus() {
  const [status, setStatus] = useState<'checking' | 'applied' | 'pending'>('checking');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  async function checkMigrationStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('pending');
        setDetails('Not authenticated');
        return;
      }

      // Try to insert/update with the correct conflict spec
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          workspace_id: null,
          voice_assistant_enabled: true,
        }, {
          onConflict: 'user_id,workspace_id'
        });

      if (error) {
        console.error('Migration check error:', error);
        setStatus('pending');
        setDetails(`Error: ${error.message} (Code: ${error.code})`);
      } else {
        setStatus('applied');
        setDetails('Database migrations have been applied successfully!');
      }
    } catch (err) {
      console.error('Migration check failed:', err);
      setStatus('pending');
      setDetails(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin" />}
          {status === 'applied' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          {status === 'pending' && <XCircle className="h-5 w-5 text-yellow-500" />}
          Migration Status
        </CardTitle>
        <CardDescription>
          Database schema status for voice assistant features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {status === 'checking' && (
            <p className="text-sm text-muted-foreground">Checking database schema...</p>
          )}
          {status === 'applied' && (
            <div className="space-y-2">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✅ Migrations Applied
              </p>
              <p className="text-xs text-muted-foreground">
                API keys will be saved to the database and persist across sessions.
              </p>
            </div>
          )}
          {status === 'pending' && (
            <div className="space-y-2">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                ⏳ Migrations Pending
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Lovable hasn't applied the database migrations yet. Your API key will be saved to localStorage (browser only) until migrations are applied.
              </p>
              <div className="bg-muted rounded p-2">
                <p className="text-xs font-mono break-all">{details}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The migrations are in the repo. Lovable will apply them automatically during the next deployment.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
