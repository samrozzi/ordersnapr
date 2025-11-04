import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, fileName } = await req.json();
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing form structure for:", fileName);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a form structure analyzer. Analyze forms and extract field definitions to create digital form templates."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this form image and identify all input fields, their types, labels, and any options. Group related fields into logical sections. Detect if signature is required."
              },
              {
                type: "image_url",
                image_url: { url: imageData }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_form_structure",
              description: "Extract the structure of a form including sections, fields, types, labels, and options",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Section title or heading" },
                        fields: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: { 
                                type: "string", 
                                enum: ["text", "number", "date", "select", "radio", "checkbox", "textarea", "email", "phone", "address", "file", "signature"],
                                description: "Field input type"
                              },
                              label: { type: "string", description: "Field label or question text" },
                              placeholder: { type: "string", description: "Placeholder text if visible" },
                              required: { type: "boolean", description: "Whether field appears required (asterisk, 'required' text, etc)" },
                              options: { 
                                type: "array", 
                                items: { type: "string" },
                                description: "Options for select, radio, or checkbox fields"
                              },
                              description: { type: "string", description: "Any helper text or description" }
                            },
                            required: ["type", "label"]
                          }
                        }
                      },
                      required: ["title", "fields"]
                    }
                  },
                  requireSignature: { type: "boolean", description: "Whether form has a signature field" }
                },
                required: ["sections"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_form_structure" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error("Credits exhausted");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_form_structure") {
      console.error("No valid tool call in response");
      return new Response(
        JSON.stringify({ error: "Could not detect form fields. Please ensure the image is clear and shows a complete form." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formStructure = JSON.parse(toolCall.function.arguments);
    console.log("Successfully extracted form structure with", formStructure.sections?.length || 0, "sections");

    return new Response(
      JSON.stringify(formStructure),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in extract-form-structure:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
