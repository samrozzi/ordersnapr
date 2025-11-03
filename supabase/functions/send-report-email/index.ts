import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escaping function to prevent XSS attacks
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

interface EmailReportRequest {
  recipientEmail: string;
  reportType: "job-audit" | "ride-along" | "form-submission";
  pdfBase64: string;
  fileName: string;
  photos?: Array<{
    filename: string;
    content: string;
    caption?: string;
  }>;
  formData: {
    technicianName?: string;
    customerName?: string;
    address?: string;
    date?: string;
    ban?: string;
    accountNumber?: string;
    reportedBy?: string;
    observations?: string;
    observerName?: string;
    overallNotes?: string;
    formTitle?: string;
    submissionId?: string;
    status?: string;
    submittedAt?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check content length before parsing to prevent memory issues
    const contentLength = req.headers.get("content-length");
    const maxSize = 25 * 1024 * 1024; // 25MB limit
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      console.error("Request payload too large:", contentLength);
      return new Response(
        JSON.stringify({ 
          error: "Request payload too large. Maximum size is 25MB. Try reducing photo quality or count." 
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Parsing request body...");
    const { recipientEmail, reportType, pdfBase64, fileName, photos, formData }: EmailReportRequest = await req.json();

    console.log("Sending email to:", recipientEmail);
    console.log("Report type:", reportType);

    // Validate inputs
    if (!recipientEmail || !reportType || !pdfBase64 || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Configure sender email address
    // For custom domains: Verify your domain at https://resend.com/domains
    // Then set RESEND_FROM_EMAIL secret to "OrderSnapr Reports <reports@ordersnapr.com>"
    // Default uses Resend's test domain which works immediately
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "OrderSnapr Reports <onboarding@resend.dev>";

    // Generate email subject and body based on report type
    let subject: string;
    let htmlBody: string;

    if (reportType === "form-submission") {
      subject = `Form Submission: ${formData.formTitle || 'Form'}`;
      htmlBody = `
        <h2>${escapeHtml(formData.formTitle || 'Form Submission')}</h2>
        <p>Please find attached the form submission with the following details:</p>
        <ul>
          ${formData.submissionId ? `<li><strong>Submission ID:</strong> ${escapeHtml(formData.submissionId.slice(0, 8))}</li>` : ''}
          ${formData.status ? `<li><strong>Status:</strong> ${escapeHtml(formData.status.charAt(0).toUpperCase() + formData.status.slice(1))}</li>` : ''}
          ${formData.submittedAt ? `<li><strong>Submitted:</strong> ${escapeHtml(new Date(formData.submittedAt).toLocaleString())}</li>` : ''}
        </ul>
        ${formData.observations ? `
          <h3 style="margin-top: 20px;">General Observations:</h3>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 5px;">${escapeHtml(formData.observations)}</p>
        ` : ''}
        ${photos && photos.length > 0 ? `<p style="margin-top: 20px;"><strong>Photos:</strong> ${photos.length} photo(s) attached</p>` : ''}
        <p style="margin-top: 20px;">This form was submitted via OrderSnapr.</p>
        <p style="color: #666; margin-top: 30px;">Best regards,<br>OrderSnapr Team</p>
      `;
    } else if (reportType === "job-audit") {
      subject = `Job Quality Inspection Report - ${formData.technicianName || 'Technician'}`;
      htmlBody = `
        <h2>Job Quality Inspection Report</h2>
        <p>Please find attached the job quality inspection report with the following details:</p>
        <ul>
          ${formData.reportedBy ? `<li><strong>Report Created By:</strong> ${escapeHtml(formData.reportedBy)}</li>` : ''}
          ${formData.technicianName ? `<li><strong>Technician:</strong> ${escapeHtml(formData.technicianName)}</li>` : ''}
          ${formData.customerName ? `<li><strong>Customer:</strong> ${escapeHtml(formData.customerName)}</li>` : ''}
          ${formData.address ? `<li><strong>Address:</strong> ${escapeHtml(formData.address)}</li>` : ''}
          ${formData.ban ? `<li><strong>BAN:</strong> ${escapeHtml(formData.ban)}</li>` : ''}
          ${formData.date ? `<li><strong>Service Date:</strong> ${escapeHtml(formData.date)}</li>` : ''}
        </ul>
        ${formData.observations ? `
          <h3 style="margin-top: 20px;">Observations:</h3>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 5px;">${escapeHtml(formData.observations)}</p>
        ` : ''}
        ${photos && photos.length > 0 ? `<p style="margin-top: 20px;"><strong>Photos:</strong> ${photos.length} photo(s) attached</p>` : ''}
        <p style="margin-top: 20px;">This report was generated from OrderSnapr.</p>
        <p style="color: #666; margin-top: 30px;">Best regards,<br>OrderSnapr Team</p>
      `;
    } else {
      subject = `Ride-Along Observation Report - ${formData.technicianName || 'Technician'}`;
      htmlBody = `
        <h2>Ride-Along Observation Report</h2>
        <p>Please find attached the ride-along observation report with the following details:</p>
        <ul>
          ${formData.observerName ? `<li><strong>Observer:</strong> ${escapeHtml(formData.observerName)}</li>` : ''}
          ${formData.technicianName ? `<li><strong>Technician:</strong> ${escapeHtml(formData.technicianName)}</li>` : ''}
          ${formData.customerName ? `<li><strong>Customer:</strong> ${escapeHtml(formData.customerName)}</li>` : ''}
          ${formData.address ? `<li><strong>Address:</strong> ${escapeHtml(formData.address)}</li>` : ''}
          ${formData.accountNumber ? `<li><strong>Account Number:</strong> ${escapeHtml(formData.accountNumber)}</li>` : ''}
          ${formData.date ? `<li><strong>Date:</strong> ${escapeHtml(formData.date)}</li>` : ''}
        </ul>
        ${formData.overallNotes ? `
          <h3 style="margin-top: 20px;">Overall Notes:</h3>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 5px;">${escapeHtml(formData.overallNotes)}</p>
        ` : ''}
        ${photos && photos.length > 0 ? `<p style="margin-top: 20px;"><strong>Photos:</strong> ${photos.length} photo(s) attached</p>` : ''}
        <p style="margin-top: 20px;">This report was generated from OrderSnapr.</p>
        <p style="color: #666; margin-top: 30px;">Best regards,<br>OrderSnapr Team</p>
      `;
    }

    // Build attachments array - PDF + photos
    const attachments: any[] = [
      {
        filename: fileName,
        content: pdfBase64,
      },
    ];

    // Add individual photos as attachments with size management
    if (photos && photos.length > 0) {
      console.log(`Processing ${photos.length} photos...`);
      let totalPhotoSize = 0;
      const maxPhotoSize = 20 * 1024 * 1024; // 20MB for photos total
      
      for (const photo of photos) {
        // Estimate size (base64 is roughly 1.37x the binary size)
        const estimatedSize = (photo.content.length * 0.75);
        totalPhotoSize += estimatedSize;
        
        if (totalPhotoSize > maxPhotoSize) {
          console.warn(`Skipping remaining photos - size limit reached (${totalPhotoSize} bytes)`);
          break;
        }
        
        attachments.push({
          filename: photo.filename,
          content: photo.content,
        });
      }
      console.log(`Added ${attachments.length - 1} photos (${totalPhotoSize} bytes)`);
    }

    // Call Resend API directly using fetch
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: subject,
        html: htmlBody,
        attachments: attachments,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailResponse = await resendResponse.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Report emailed successfully",
        emailId: emailResponse.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-report-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send email",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
