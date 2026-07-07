export interface SendEmailParams {
  to_email: string;
  member_name: string;
  member_code: string;
  category_name: string;
  expiry_date: string;
  card_url?: string;
  sendgrid_api_key?: string;
}

/**
 * Sends a membership card email directly from the client side using SendGrid.
 * NOTE: This will expose the API key in the client and might fail with CORS errors
 * if the browser blocks direct requests to api.sendgrid.com.
 */
export const sendMembershipCardEmailDirectly = async (params: SendEmailParams): Promise<any> => {
  const {
    to_email,
    member_name,
    member_code,
    category_name,
    expiry_date,
    card_url,
    sendgrid_api_key,
  } = params;

  const apiKey = sendgrid_api_key || import.meta.env.VITE_SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SendGrid API key is not configured in client environment.");
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(member_code)}`;

  let cardUrlButton = '';
  if (card_url) {
    cardUrlButton = `
            <!-- Card URL Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 30px 0;">
              <tr>
                <td align="center">
                  <a href="${card_url}" target="_blank" style="background: linear-gradient(135deg, #d4a012 0%, #f0c040 50%, #e8a808 100%); color: #1a0533; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(240, 192, 64, 0.4); text-transform: uppercase; letter-spacing: 1px; font-family: 'Arial', sans-serif;">
                    View & Download Card
                  </a>
                </td>
              </tr>
            </table>
    `;
  }

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

              ${cardUrlButton}

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

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to_email }],
        },
      ],
      from: {
        email: "grand@cinnamonhotels.com",
        name: "Cinnamon Grand Colombo",
      },
      subject: `Your ${category_name} Membership Card - Cinnamon Grand Colombo`,
      content: [
        {
          type: "text/html",
          value: emailHtml,
        },
      ],
    }),
  });

  if (!response.ok) {
    let errorText = "";
    try {
      errorText = await response.text();
    } catch (_) {}
    throw new Error(
      `SendGrid direct send failed with status ${response.status}: ${errorText || "Network error. This is likely a CORS block by SendGrid."}`
    );
  }

  return response.status === 204 ? {} : await response.json();
};
