import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MobileNote {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

// Convert notes table content blocks to plain text body
function contentToBody(content: any): string {
  if (!content || !content.blocks) return '';
  
  return content.blocks
    .map((block: any) => {
      if (block.type === 'paragraph') return block.content || '';
      if (block.type === 'heading') return block.content || '';
      return '';
    })
    .filter((text: string) => text.length > 0)
    .join('\n\n');
}

// Convert plain text body to notes content blocks
function bodyToContent(body: string): any {
  const paragraphs = body.split('\n\n').filter(p => p.trim().length > 0);
  
  return {
    blocks: paragraphs.map((text, index) => ({
      id: `block-${Date.now()}-${index}`,
      type: 'paragraph',
      content: text.trim(),
    }))
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const noteId = pathParts[pathParts.length - 1];

    // GET - Return all notes
    if (req.method === 'GET') {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('id, title, content, updated_at')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch notes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const mobileNotes: MobileNote[] = (notes || []).map(note => ({
        id: note.id,
        title: note.title || '',
        body: contentToBody(note.content),
        updatedAt: note.updated_at,
      }));

      return new Response(
        JSON.stringify(mobileNotes),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Upsert note
    if (req.method === 'POST') {
      const mobileNote: MobileNote = await req.json();

      if (!mobileNote.id) {
        return new Response(
          JSON.stringify({ error: 'Note id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if note exists
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('id', mobileNote.id)
        .eq('user_id', user.id)
        .single();

      const noteData = {
        title: mobileNote.title || 'Untitled Note',
        content: bodyToContent(mobileNote.body || ''),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing note
        const { data: updated, error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', mobileNote.id)
          .eq('user_id', user.id)
          .select('id, title, content, updated_at')
          .single();

        if (error) {
          console.error('Error updating note:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update note' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response: MobileNote = {
          id: updated.id,
          title: updated.title,
          body: contentToBody(updated.content),
          updatedAt: updated.updated_at,
        };

        return new Response(
          JSON.stringify(response),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Create new note
        const { data: created, error } = await supabase
          .from('notes')
          .insert({
            id: mobileNote.id,
            user_id: user.id,
            org_id: null,
            ...noteData,
          })
          .select('id, title, content, updated_at')
          .single();

        if (error) {
          console.error('Error creating note:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create note' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response: MobileNote = {
          id: created.id,
          title: created.title,
          body: contentToBody(created.content),
          updatedAt: created.updated_at,
        };

        return new Response(
          JSON.stringify(response),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // DELETE - Delete note
    if (req.method === 'DELETE' && noteId) {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting note:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete note' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
