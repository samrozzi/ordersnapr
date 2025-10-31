import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { User, Shield, Building, Clock, Key } from 'lucide-react';

interface SessionData {
  email: string | null;
  userId: string | null;
  approvalStatus: string | null;
  organizationId: string | null;
  organizationName: string | null;
  hasToken: boolean;
  tokenExpiry: string | null;
}

export const SessionInfo = () => {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionInfo = async () => {
    try {
      // Get current user and session
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!user) {
        setSessionData(null);
        setLoading(false);
        return;
      }

      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          approval_status,
          organization_id,
          organizations (
            name
          )
        `)
        .eq('id', user.id)
        .maybeSingle();

      setSessionData({
        email: user.email || null,
        userId: user.id,
        approvalStatus: profile?.approval_status || null,
        organizationId: profile?.organization_id || null,
        organizationName: (profile?.organizations as any)?.name || null,
        hasToken: !!session?.access_token,
        tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null,
      });
    } catch (error) {
      console.error('SessionInfo fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  if (loading) {
    return null;
  }

  if (!sessionData) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Session Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="destructive">No Session</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Session Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">Email:</span>
          <span className="font-mono">{sessionData.email || 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Key className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">User ID:</span>
          <span className="font-mono text-xs">{sessionData.userId?.substring(0, 8)}...</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">Approval:</span>
          <Badge variant={sessionData.approvalStatus === 'approved' ? 'default' : 'secondary'}>
            {sessionData.approvalStatus || 'Unknown'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Building className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">Organization:</span>
          <span>{sessionData.organizationName || 'None'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Key className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">Auth Token:</span>
          <Badge variant={sessionData.hasToken ? 'default' : 'destructive'}>
            {sessionData.hasToken ? 'Present' : 'Missing'}
          </Badge>
        </div>
        
        {sessionData.tokenExpiry && (
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">Token Expires:</span>
            <span className="text-xs">{sessionData.tokenExpiry}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
