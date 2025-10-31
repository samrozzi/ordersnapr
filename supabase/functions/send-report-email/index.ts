import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailReportRequest {
  recipientEmail: string;
  reportType: "job-audit" | "ride-along";
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
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Generate email subject and body based on report type
    const subject = reportType === "job-audit" 
      ? `Job Quality Inspection Report - ${formData.technicianName || 'Technician'}`
      : `Ride-Along Observation Report - ${formData.technicianName || 'Technician'}`;

    const htmlBody = reportType === "job-audit" 
      ? `
        <h2>Job Quality Inspection Report</h2>
        <p>Please find attached the job quality inspection report with the following details:</p>
        <ul>
          ${formData.reportedBy ? `<li><strong>Report Created By:</strong> ${formData.reportedBy}</li>` : ''}
          ${formData.technicianName ? `<li><strong>Technician:</strong> ${formData.technicianName}</li>` : ''}
          ${formData.customerName ? `<li><strong>Customer:</strong> ${formData.customerName}</li>` : ''}
          ${formData.address ? `<li><strong>Address:</strong> ${formData.address}</li>` : ''}
          ${formData.ban ? `<li><strong>BAN:</strong> ${formData.ban}</li>` : ''}
          ${formData.date ? `<li><strong>Service Date:</strong> ${formData.date}</li>` : ''}
        </ul>
        ${formData.observations ? `
          <h3 style="margin-top: 20px;">Observations:</h3>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 5px;">${formData.observations}</p>
        ` : ''}
        ${photos && photos.length > 0 ? `<p style="margin-top: 20px;"><strong>Photos:</strong> ${photos.length} photo(s) attached</p>` : ''}
        <p style="margin-top: 20px;">This report was generated from OrderSnapr.</p>
        <p style="color: #666; margin-top: 30px;">Best regards,<br>OrderSnapr Team</p>
      `
      : `
        <h2>Ride-Along Observation Report</h2>
        <p>Please find attached the ride-along observation report with the following details:</p>
        <ul>
          ${formData.observerName ? `<li><strong>Observer:</strong> ${formData.observerName}</li>` : ''}
          ${formData.technicianName ? `<li><strong>Technician:</strong> ${formData.technicianName}</li>` : ''}
          ${formData.customerName ? `<li><strong>Customer:</strong> ${formData.customerName}</li>` : ''}
          ${formData.address ? `<li><strong>Address:</strong> ${formData.address}</li>` : ''}
          ${formData.accountNumber ? `<li><strong>Account Number:</strong> ${formData.accountNumber}</li>` : ''}
          ${formData.date ? `<li><strong>Date:</strong> ${formData.date}</li>` : ''}
        </ul>
        ${formData.overallNotes ? `
          <h3 style="margin-top: 20px;">Overall Notes:</h3>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 5px;">${formData.overallNotes}</p>
        ` : ''}
        ${photos && photos.length > 0 ? `<p style="margin-top: 20px;"><strong>Photos:</strong> ${photos.length} photo(s) attached</p>` : ''}
        <p style="margin-top: 20px;">This report was generated from OrderSnapr.</p>
        <p style="color: #666; margin-top: 30px;">Best regards,<br>OrderSnapr Team</p>
      `;

    // Build attachments array - PDF + photos
    const attachments: any[] = [
      {
        filename: fileName,
        content: pdfBase64,
      },
    ];

    // Add individual photos as attachments
    if (photos && photos.length > 0) {
      photos.forEach((photo) => {
        attachments.push({
          filename: photo.filename,
          content: photo.content,
        });
      });
    }

    // Call Resend API directly using fetch
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OrderSnapr Reports <reports@ordersnapr.com>",
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
