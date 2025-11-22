import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mobile-notes-key",
};

interface MobileNote {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

// Convert notes table content blocks to plain text body
function contentToBody(content: any): string {
  if (!content || !content.blocks) return "";

  return content.blocks
    .map((block: any) => {
      if (block.type === "paragraph") return block.content || "";
      if (block.type === "heading") return block.content || "";
      return "";
    })
    .filter((text: string) => text.length > 0)
    .join("\n\n");
}

// Convert plain text body to notes content blocks
function bodyToContent(body: string): any {
  const paragraphs = body.split("\n\n").filter((p) => p.trim().length > 0);

  return {
    blocks: paragraphs.map((text, index) => ({
      id: `block-${Date.now()}-${index}`,
      type: "paragraph",
      content: text.trim(),
    })),
  };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log("mobile-notes hit:", req.method, url.pathname);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ----- API key auth -----
    const apiKey = req.headers.get("x-mobile-notes-key");
    const expectedKey = Deno.env.get("MOBILE_NOTES_API_KEY");

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Invalid mobile notes API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now we hard-wire to your user + org
    const userId = "bd3a5b81-f3c3-4dee-b334-18130dcebe73";
    const orgId = "d7d395bf-651e-432a-8788-78d1fd90a258";

    const pathParts = url.pathname.split("/").filter((p) => p);
    const noteId = pathParts[pathParts.length - 1];

    // ----- GET: return all notes for this user (any org) -----
    if (req.method === "GET") {
      const { data: notes, error } = await supabase
        .from("notes")
        .select("id, title, content, updated_at, user_id, org_id")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch notes" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mobileNotes: MobileNote[] = (notes || []).map((note: any) => ({
        id: note.id,
        title: note.title || "",
        body: contentToBody(note.content),
        updatedAt: note.updated_at,
      }));

      return new Response(JSON.stringify(mobileNotes), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- POST: upsert note for this user -----
    if (req.method === "POST") {
      const mobileNote: MobileNote = await req.json();

      if (!mobileNote.id) {
        return new Response(JSON.stringify({ error: "Note id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Does this note already exist for this user?
      const { data: existing } = await supabase
        .from("notes")
        .select("id")
        .eq("id", mobileNote.id)
        .eq("user_id", userId)
        .single();

      const noteData = {
        title: mobileNote.title || "Untitled Note",
        content: bodyToContent(mobileNote.body || ""),
        updated_at: new Date().toISOString(),
        user_id: userId,
        org_id: orgId, // mobile-created notes go into this org
      };

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from("notes")
          .update(noteData)
          .eq("id", mobileNote.id)
          .eq("user_id", userId)
          .select("id, title, content, updated_at")
          .single();

        if (error) {
          console.error("Error updating note:", error);
          return new Response(JSON.stringify({ error: "Failed to update note" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const response: MobileNote = {
          id: updated.id,
          title: updated.title,
          body: contentToBody(updated.content),
          updatedAt: updated.updated_at,
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from("notes")
          .insert({
            id: mobileNote.id,
            ...noteData,
          })
          .select("id, title, content, updated_at")
          .single();

        if (error) {
          console.error("Error creating note:", error);
          return new Response(JSON.stringify({ error: "Failed to create note" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const response: MobileNote = {
          id: created.id,
          title: created.title,
          body: contentToBody(created.content),
          updatedAt: created.updated_at,
        };

        return new Response(JSON.stringify(response), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ----- DELETE: delete by id for this user -----
    if (req.method === "DELETE" && noteId) {
      const { error } = await supabase.from("notes").delete().eq("id", noteId).eq("user_id", userId);

      if (error) {
        console.error("Error deleting note:", error);
        return new Response(JSON.stringify({ error: "Failed to delete note" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ----- Fallback -----
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
