import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface NewChatNotificationParams {
  repEmail: string;
  repName: string;
  customerName: string;
  customerPhone: string;
  conversationId: string;
  chatMode: "HUMAN" | "AI";
}

/**
 * Sends an email notification to the rep when a new chat is initiated.
 * Uses Resend API for transactional emails.
 */
export async function sendNewChatNotification({
  repEmail,
  repName,
  customerName,
  customerPhone,
  conversationId,
  chatMode,
}: NewChatNotificationParams): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://chat.peptidesforlife.co";

  const modeLabel = chatMode === "AI" ? "AI Chat" : "Live Chat";
  const subjectPrefix = chatMode === "AI" ? "AI " : "";

  console.log(`Sending email notification to ${repEmail} for customer ${customerName}`);

  const { data: emailId, error } = await resend.emails.send({
    from: "JA Protocol Chat <notification@brighttier.com>",
    to: repEmail,
    subject: `New ${subjectPrefix}Chat: ${customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">New Chat Initiated</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 100px;">Customer:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
            <td style="padding: 8px 0; color: #111827;">${customerPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Mode:</td>
            <td style="padding: 8px 0;">
              <span style="background: ${chatMode === "AI" ? "#f3e8ff" : "#dbeafe"};
                           color: ${chatMode === "AI" ? "#7c3aed" : "#2563eb"};
                           padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                ${modeLabel}
              </span>
            </td>
          </tr>
        </table>

        <p style="margin-top: 24px;">
          <a href="${baseUrl}/admin?conversation=${conversationId}"
             style="display: inline-block; background: #2563eb; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;
                    font-weight: 500;">
            View Chat
          </a>
        </p>

        <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
          This is an automated notification from Peptides Chat.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`Email sent successfully, id: ${emailId?.id}`);
}
