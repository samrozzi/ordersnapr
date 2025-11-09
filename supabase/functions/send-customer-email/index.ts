import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface SendInvoiceEmailRequest {
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  invoiceData: {
    issue_date: string;
    due_date: string | null;
    total_cents: number;
    status: string;
  };
  portalToken?: string;
  organizationName?: string;
}

interface SendPortalLinkRequest {
  recipientEmail: string;
  recipientName: string;
  portalToken: string;
  organizationName?: string;
  message?: string;
}

type EmailRequest =
  | { type: "invoice"; data: SendInvoiceEmailRequest }
  | { type: "portal_link"; data: SendPortalLinkRequest };

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: EmailRequest = await req.json();
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "OrderSnapr <onboarding@resend.dev>";
    const baseUrl = req.headers.get("origin") || "https://ordersnapr.com";

    let subject: string;
    let htmlBody: string;
    let to: string;

    if (requestData.type === "invoice") {
      const { data } = requestData;
      to = data.recipientEmail;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return new Response(
          JSON.stringify({ error: "Invalid email address format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      subject = `Invoice ${data.invoiceNumber} from ${data.organizationName || 'OrderSnapr'}`;

      const portalLink = data.portalToken
        ? `${baseUrl}/portal/${data.portalToken}`
        : null;

      htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
        ${data.organizationName ? escapeHtml(data.organizationName) : 'OrderSnapr'}
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1a1a1a;">
        New Invoice: ${escapeHtml(data.invoiceNumber)}
      </h2>

      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
        Hello ${escapeHtml(data.recipientName)},
      </p>

      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
        ${data.organizationName ? escapeHtml(data.organizationName) : 'We'} ${data.invoiceData.status === 'sent' ? 'have' : 'has'} sent you an invoice. Please find the details below:
      </p>

      <!-- Invoice Details Card -->
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Invoice Number:</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right; color: #1a1a1a;">
              ${escapeHtml(data.invoiceNumber)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Issue Date:</td>
            <td style="padding: 8px 0; font-size: 14px; text-align: right; color: #1a1a1a;">
              ${formatDate(data.invoiceData.issue_date)}
            </td>
          </tr>
          ${data.invoiceData.due_date ? `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Due Date:</td>
            <td style="padding: 8px 0; font-size: 14px; text-align: right; color: #1a1a1a;">
              ${formatDate(data.invoiceData.due_date)}
            </td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #e5e7eb;">
            <td style="padding: 16px 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Total Amount:</td>
            <td style="padding: 16px 0 8px 0; font-size: 20px; font-weight: 700; text-align: right; color: #667eea;">
              ${formatCurrency(data.invoiceData.total_cents)}
            </td>
          </tr>
        </table>
      </div>

      ${portalLink ? `
      <!-- Portal Link Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalLink}"
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
          View Invoice & Portal
        </a>
      </div>

      <p style="margin: 20px 0 0 0; font-size: 14px; text-align: center; color: #6b7280;">
        Or copy this link: <a href="${portalLink}" style="color: #667eea; word-break: break-all;">${portalLink}</a>
      </p>
      ` : ''}

      <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
        If you have any questions about this invoice, please don't hesitate to contact us.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
        ${data.organizationName ? escapeHtml(data.organizationName) : 'OrderSnapr'}
      </p>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        Powered by OrderSnapr
      </p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      // Portal link email
      const { data } = requestData;
      to = data.recipientEmail;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return new Response(
          JSON.stringify({ error: "Invalid email address format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      subject = `Access Your Customer Portal - ${data.organizationName || 'OrderSnapr'}`;
      const portalLink = `${baseUrl}/portal/${data.portalToken}`;

      htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
        ${data.organizationName ? escapeHtml(data.organizationName) : 'OrderSnapr'}
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1a1a1a;">
        Your Customer Portal Access
      </h2>

      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
        Hello ${escapeHtml(data.recipientName)},
      </p>

      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
        ${data.message || 'We\'ve created a secure portal where you can view your work orders, invoices, and other important information. Click the button below to access your portal.'}
      </p>

      <!-- Features -->
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
          What you can do in your portal:
        </h3>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
          <li>View all your work orders and their status</li>
          <li>Access invoices and payment information</li>
          <li>Review job details, notes, and photos</li>
          <li>Track completed and upcoming work</li>
        </ul>
      </div>

      <!-- Portal Link Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalLink}"
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
          Access Your Portal
        </a>
      </div>

      <p style="margin: 20px 0 0 0; font-size: 14px; text-align: center; color: #6b7280;">
        Or copy this link: <a href="${portalLink}" style="color: #667eea; word-break: break-all;">${portalLink}</a>
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin: 30px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>🔒 Secure Access:</strong> This link is unique to you and provides secure, read-only access to your information. You can access it anytime without needing a password.
        </p>
      </div>

      <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
        If you have any questions or need assistance, please don't hesitate to contact us.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
        ${data.organizationName ? escapeHtml(data.organizationName) : 'OrderSnapr'}
      </p>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        Powered by OrderSnapr
      </p>
    </div>
  </div>
</body>
</html>
      `;
    }

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: htmlBody,
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
        message: "Email sent successfully",
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
    console.error("Error in send-customer-email function:", error);
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
