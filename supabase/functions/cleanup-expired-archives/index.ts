import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup of expired archived notes...');

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`Checking for notes archived before: ${thirtyDaysAgo.toISOString()}`);

    // Find free tier users (no premium subscription)
    const { data: freeUsers, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .or('subscription_status.is.null,subscription_status.eq.free');

    if (userError) {
      console.error('Error fetching free tier users:', userError);
      throw userError;
    }

    if (!freeUsers || freeUsers.length === 0) {
      console.log('No free tier users found');
      return new Response(
        JSON.stringify({ message: 'No free tier users found', deletedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const freeUserIds = freeUsers.map(u => u.id);
    console.log(`Found ${freeUserIds.length} free tier users`);

    // Delete archived notes older than 30 days for free users
    const { data, error } = await supabase
      .from('notes')
      .delete()
      .in('user_id', freeUserIds)
      .lt('archived_at', thirtyDaysAgo.toISOString())
      .not('archived_at', 'is', null)
      .select('id');

    if (error) {
      console.error('Error deleting expired notes:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`Successfully deleted ${deletedCount} expired archived notes`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        message: `Deleted ${deletedCount} expired archived notes`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
