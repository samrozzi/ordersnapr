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
    const { image, formType } = await req.json();
    
    if (!image || !formType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image and formType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing ${formType} form extraction`);

    // Define the extraction schema based on form type
    const schema = formType === 'job-audit' 
      ? {
          type: "object",
          properties: {
            technicianName: { type: "string", description: "Full name of the technician" },
            accountNumber: { type: "string", description: "Account number or BAN (typically 9-10 digits)" },
            serviceDate: { type: "string", description: "Service date in YYYY-MM-DD format" },
            address: { type: "string", description: "Full service address including street, city, state, zip" }
          },
          required: ["technicianName", "accountNumber", "serviceDate", "address"]
        }
      : {
          type: "object",
          properties: {
            accountNumber: { type: "string", description: "Account number (typically 9-10 digits)" },
            address: { type: "string", description: "Full service address" },
            technicianName: { type: "string", description: "Full name of the technician" },
            observerName: { type: "string", description: "Full name of the observer" },
            date: { type: "string", description: "Date in YYYY-MM-DD format" },
            startTime: { type: "string", description: "Start time in HH:MM format (24-hour)" },
            endTime: { type: "string", description: "End time in HH:MM format (24-hour)" }
          },
          required: ["accountNumber", "address", "technicianName", "observerName", "date", "startTime", "endTime"]
        };

    const systemPrompt = `Extract form data from work order image. Return null for missing fields. Format: dates as YYYY-MM-DD, times as HH:MM (24h), account numbers as digits only, full addresses, and full names.`;

    // Call Lovable AI with vision capabilities
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        max_tokens: 150,
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract ${formType === 'job-audit' ? 'job audit' : 'ride along'} form data.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_form_data",
              description: `Extract form data`,
              parameters: schema
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_form_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract form data from image. Please ensure the image is clear and contains a work order form.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in extract-form-data function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
