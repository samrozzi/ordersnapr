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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image, formType } = await req.json();
    
    if (!image || !formType) {
      throw new Error('Missing image or formType in request body');
    }

    if (!['job-audit', 'ride-along', 'overrun-report'].includes(formType)) {
      throw new Error('Invalid formType. Must be "job-audit", "ride-along", or "overrun-report"');
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
            serviceDate: { type: "string", description: "Service date in YYYY-MM-DD format" },
            address: { type: "string", description: "Service address or location" },
            customerName: { type: "string", description: "Customer/homeowner name" },
            canBeReached: { type: "string", description: "Customer contact info (phone/email)" },
            technicianName: { type: "string", description: "Primary technician name from first data row" },
            accountNumber: { type: "string", description: "Account or BAN number" },
            technicianRows: {
              type: "array",
              description: "Extract ALL technician rows from the table",
              items: {
                type: "object",
                properties: {
                  techId: { type: "string", description: "Tech ID" },
                  techName: { type: "string", description: "Technician name" },
                  techPhone: { type: "string", description: "Tech phone number" },
                  techType: { type: "string", description: "Tech type/classification (e.g., PT, ST)" },
                  ban: { type: "string", description: "BAN or account number" }
                }
              }
            }
          },
          required: ["serviceDate"]
        }
      : formType === 'overrun-report'
      ? {
          type: "object",
          properties: {
            technicianRows: {
              type: "array",
              description: "Extract ALL technician rows from the table",
              items: {
                type: "object",
                properties: {
                  techName: { type: "string", description: "Full technician name (e.g., 'Adside, Devy' → 'Devy Adside')" },
                  techId: { type: "string", description: "Tech ID (e.g., 'DA4436')" },
                  techPhone: { type: "string", description: "Tech phone number" },
                  techType: { type: "string", description: "Tech type/classification (e.g., 'PT', 'ST')" }
                }
              }
            }
          },
          required: ["technicianRows"]
        }
      : {
          type: "object",
          properties: {
            observationDate: { type: "string", description: "Observation date in YYYY-MM-DD format" },
            technicianName: { type: "string", description: "Technician being observed" },
            observerName: { type: "string", description: "Observer/supervisor name" },
            startTime: { type: "string", description: "Start time in HH:MM format (24h)" },
            endTime: { type: "string", description: "End time in HH:MM format (24h)" },
            location: { type: "string", description: "Location or address" },
            performanceRating: { type: "string", description: "Overall performance rating if visible" },
            notes: { type: "string", description: "Any additional notes or comments" }
          },
          required: ["observationDate"]
        };

    const systemPrompt = formType === 'job-audit'
      ? `Extract data from AT&T job audit inspection form.

IMPORTANT - PERSON ROLES:
- CUSTOMER/ACCOUNT HOLDER = Person whose name appears at the top or in account info area (e.g., "HARRIS, ANTHONY" above a table). This is NOT the technician.
- TECHNICIAN = Field tech from the FIRST DATA ROW of any technician table (not header row).

TECHNICIAN TABLE EXTRACTION:
If you see a table with columns like "Tech ID", "Tech Name", "Phone", "Type", "BAN":
1. Skip any header rows that just repeat column names
2. Extract the FIRST DATA ROW as the primary technician:
   - technicianName = full name from first data row (e.g., "Adside, Devy" → format as "Devy Adside")
   - Extract corresponding Tech ID, Phone, Type from that same row
3. Extract ALL data rows (including the first) into technicianRows array

Example:
If table shows:
- Header: "HARRIS, ANTHONY November 12, 2025"  ← This is the customer/account
- Row 1: DA4435 | Adside, Devy | 704-605-4138 | PT  ← Extract this for primary fields
- Row 2: EB6080 | Barber, Elmer | 704-724-5817 | ST
Then:
- customerName = "Anthony Harris"
- technicianName = "Devy Adside"
- accountNumber from top area if present
- technicianRows = [Row 1 object, Row 2 object, ...]

Format: dates as YYYY-MM-DD, times as HH:MM (24h), account numbers as digits only.`
      : formType === 'overrun-report'
      ? `Extract technician data from AT&T technician table only.

TECHNICIAN TABLE EXTRACTION:
Extract ALL rows from the technician table into technicianRows array.
If you see a table with columns like "Tech ID", "Tech Name", "Phone", "Type":
1. Skip any header rows that just repeat column names
2. Extract ALL data rows as objects with: techName, techId, techPhone, techType
3. Format names properly (e.g., "Adside, Devy" → "Devy Adside")

Example table:
- Row 1: DA4435 | Adside, Devy | 704-605-4138 | PT
- Row 2: EB6080 | Barber, Elmer | 704-724-5817 | ST
- Row 3: GM710S | McCrary, Guy | 704-450-3157 | PT

Return:
technicianRows = [
  { techName: "Devy Adside", techId: "DA4435", techPhone: "704-605-4138", techType: "PT" },
  { techName: "Elmer Barber", techId: "EB6080", techPhone: "704-724-5817", techType: "ST" },
  { techName: "Guy McCrary", techId: "GM710S", techPhone: "704-450-3157", techType: "PT" }
]

Only extract technician table data - ignore any customer names, addresses, or other form fields.`
      : `Extract data from AT&T ride-along observation form.
THREE DISTINCT PEOPLE:
1. CUSTOMER = homeowner/business receiving service (e.g., McKinzey Sayers)
2. TECHNICIAN = AT&T field tech being observed during installation 
3. OBSERVER = field manager conducting ride-along (Sam Rozzi, Josh Ghebremichael, or Christopher Badger)
CAN BE REACHED = phone, email, or contact method for customer.
Format: dates as YYYY-MM-DD, times as HH:MM (24h), account numbers as digits only.`;

    // Call Lovable AI with vision capabilities
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 2000,
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
