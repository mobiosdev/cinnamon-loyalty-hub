import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendCardEmailRequest {
  to_email: string;
  member_name: string;
  member_code: string;
  category_name: string;
  expiry_date: string;
  card_image_base64?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to_email,
      member_name,
      member_code,
      category_name,
      expiry_date,
      card_image_base64,
    }: SendCardEmailRequest = await req.json();

    if (!to_email || !member_name || !member_code) {
      throw new Error('Missing required fields: to_email, member_name, member_code');
    }

    // Build QR code URL for the email
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(member_code)}`;

    // Build premium HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Cinnamon Grand Membership Card</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f0eb; font-family: 'Georgia', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0eb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(61, 26, 110, 0.15);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a0533 0%, #3d1a6e 50%, #2d1058 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #f0c040; font-size: 28px; margin: 0 0 8px 0; font-family: 'Georgia', serif; letter-spacing: 2px;">
                Cinnamon Grand Colombo
              </h1>
              <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0; letter-spacing: 3px; text-transform: uppercase;">
                ${category_name} Membership
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #2d1058; font-size: 18px; margin: 0 0 8px 0;">Dear ${member_name},</p>
              <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for being a valued member of Cinnamon Grand Colombo. Please find your digital membership card details below.
              </p>

              <!-- Membership Card Preview -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a0533 0%, #3d1a6e 50%, #2d1058 100%); border-radius: 12px; overflow: hidden; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 28px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: #f0c040; font-size: 20px; font-family: 'Georgia', serif; margin: 0 0 4px 0; letter-spacing: 1px;">
                            Cinnamon Grand
                          </p>
                          <p style="color: rgba(255,255,255,0.6); font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 20px 0;">
                            Colombo
                          </p>
                        </td>
                        <td align="right" valign="top">
                          <div style="background: #ffffff; border-radius: 8px; padding: 6px; display: inline-block;">
                            <img src="${qrCodeUrl}" alt="QR Code" width="80" height="80" style="display: block;" />
                          </div>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #ffffff; font-size: 18px; letter-spacing: 4px; text-transform: uppercase; font-family: 'Georgia', serif; margin: 0 0 20px 0;">
                      ${category_name} Membership
                    </p>
                    <p style="color: #f0e6d3; font-size: 14px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 6px 0;">
                      ${member_name}
                    </p>
                    <p style="color: rgba(240,230,211,0.8); font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 3px 0;">
                      Membership No: ${member_code}
                    </p>
                    <p style="color: rgba(240,230,211,0.8); font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; margin: 0;">
                      Expiry Date: ${expiry_date}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- QR Code Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f6f2; border-radius: 12px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="color: #2d1058; font-size: 14px; font-weight: bold; margin: 0 0 12px 0;">
                      Your QR Code
                    </p>
                    <div style="background: #ffffff; border-radius: 12px; padding: 12px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                      <img src="${qrCodeUrl}" alt="Membership QR Code" width="150" height="150" style="display: block;" />
                    </div>
                    <p style="color: #888; font-size: 11px; margin: 12px 0 0 0;">
                      Present this QR code at our outlets to avail your membership benefits.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Info -->
              <p style="color: #888; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                This is your official digital membership card from Cinnamon Grand Colombo. 
                For any queries, please contact our front desk.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a0533; padding: 20px 40px; text-align: center;">
              <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Cinnamon Grand Colombo. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Use Resend API to send email (set RESEND_API_KEY in Supabase secrets)
    // If no Resend key, fall back to Supabase built-in email or SMTP
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      // Send via Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('EMAIL_FROM') || 'Cinnamon Grand <membership@cinnamongrand.com>',
          to: [to_email],
          subject: `Your ${category_name} Membership Card - Cinnamon Grand Colombo`,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.error('Resend API error:', errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }

      const result = await resendResponse.json();
      console.log('Email sent successfully via Resend:', result);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Membership card sent to ${to_email}`,
          provider: 'resend',
          id: result.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Try SMTP via a generic email sending approach
    // Use Supabase's built-in SMTP if configured
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const smtpPort = Deno.env.get('SMTP_PORT') || '587';
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'membership@cinnamongrand.com';

    if (smtpHost && smtpUser && smtpPass) {
      // Use the Deno SMTP client
      // For edge functions, we'll use a simple HTTP-based approach
      // Since direct SMTP is complex in edge functions, we try a webhook approach
      console.log('SMTP configuration found but Edge Functions use HTTP-based email providers.');
      console.log('Please configure RESEND_API_KEY for email sending.');
      
      throw new Error('Email sending requires RESEND_API_KEY to be configured. Set it via: supabase secrets set RESEND_API_KEY=your_key');
    }

    // If no email provider configured, return an error with setup instructions
    throw new Error(
      'No email provider configured. Please set RESEND_API_KEY in Supabase secrets. ' +
      'Get a free API key at https://resend.com and run: supabase secrets set RESEND_API_KEY=your_key'
    );

  } catch (error) {
    console.error('Error in send-membership-card function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        setup_instructions: 'To enable email sending, set RESEND_API_KEY in Supabase secrets: supabase secrets set RESEND_API_KEY=your_key'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
