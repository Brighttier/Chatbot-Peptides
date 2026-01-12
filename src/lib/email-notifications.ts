import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface NewChatNotificationParams {
  repEmail: string;
  repName: string;
  repId: string;
  customerName: string;
  customerPhone: string;
  conversationId: string;
  chatMode: "HUMAN" | "AI";
  // Optional fields
  dateOfBirth?: string;
  instagramHandle?: string;
  sourceChannel?: "website" | "instagram";
  intakeAnswers?: Record<string, string>;
}

/**
 * Sends an email notification to the rep when a new chat is initiated.
 * Uses Resend API for transactional emails.
 */
export async function sendNewChatNotification({
  repEmail,
  repName,
  repId,
  customerName,
  customerPhone,
  conversationId,
  chatMode,
  dateOfBirth,
  instagramHandle,
  sourceChannel,
  intakeAnswers,
}: NewChatNotificationParams): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://support.japrotocols.com";

  const modeLabel = chatMode === "AI" ? "AI Chat" : "Live Chat";
  const subjectPrefix = chatMode === "AI" ? "AI " : "";
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const channelLabel = sourceChannel === "instagram" ? "Instagram" : "Website";

  console.log(`Sending email notification to ${repEmail} for customer ${customerName}`);

  // Build intake answers HTML if provided
  let intakeHtml = "";
  if (intakeAnswers && Object.keys(intakeAnswers).length > 0) {
    intakeHtml = `
      <tr>
        <td colspan="2" style="padding: 16px 0 8px 0; color: #111827; font-weight: 600; border-top: 1px solid #e5e7eb;">
          Intake Answers
        </td>
      </tr>
      ${Object.entries(intakeAnswers)
        .map(
          ([question, answer]) => `
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">${question}:</td>
          <td style="padding: 4px 0; color: #111827; font-size: 13px;">${answer}</td>
        </tr>
      `
        )
        .join("")}
    `;
  }

  const { data: emailId, error } = await resend.emails.send({
    from: "JA Protocol Chat <notifications@notifications.japrotocols.com>",
    to: repEmail,
    subject: `New ${subjectPrefix}Chat: ${customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">New Chat Initiated</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;">Customer:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
            <td style="padding: 8px 0; color: #111827;">${customerPhone}</td>
          </tr>
          ${dateOfBirth ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Date of Birth:</td>
            <td style="padding: 8px 0; color: #111827;">${dateOfBirth}</td>
          </tr>
          ` : ""}
          ${instagramHandle ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Instagram:</td>
            <td style="padding: 8px 0; color: #111827;">@${instagramHandle}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Chat Mode:</td>
            <td style="padding: 8px 0;">
              <span style="background: ${chatMode === "AI" ? "#f3e8ff" : "#dbeafe"};
                           color: ${chatMode === "AI" ? "#7c3aed" : "#2563eb"};
                           padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                ${modeLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Source:</td>
            <td style="padding: 8px 0;">
              <span style="background: ${sourceChannel === "instagram" ? "#fce7f3" : "#ecfdf5"};
                           color: ${sourceChannel === "instagram" ? "#be185d" : "#059669"};
                           padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                ${channelLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Assigned Rep:</td>
            <td style="padding: 8px 0; color: #111827;">${repName} (${repId})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Timestamp:</td>
            <td style="padding: 8px 0; color: #111827;">${timestamp} ET</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Conversation ID:</td>
            <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-family: monospace;">${conversationId}</td>
          </tr>
          ${intakeHtml}
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
          This is an automated notification from JA Protocol Chat.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`Email sent successfully, id: ${emailId?.id}`);
}

interface NewMessageNotificationParams {
  repEmail: string;
  customerName: string;
  customerPhone: string;
  conversationId: string;
  messagePreview: string;
  chatMode: "HUMAN" | "AI";
}

/**
 * Sends an email notification to the rep when a customer sends a new message.
 * Uses Resend API for transactional emails.
 */
export async function sendNewMessageNotification({
  repEmail,
  customerName,
  customerPhone,
  conversationId,
  messagePreview,
  chatMode,
}: NewMessageNotificationParams): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://support.japrotocols.com";

  const modeLabel = chatMode === "AI" ? "AI Chat" : "Live Chat";
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Truncate message preview to 200 characters
  const truncatedPreview =
    messagePreview.length > 200
      ? messagePreview.substring(0, 200) + "..."
      : messagePreview;

  console.log(`Sending new message notification to ${repEmail} for customer ${customerName}`);

  const { data: emailId, error } = await resend.emails.send({
    from: "JA Protocol Chat <notifications@notifications.japrotocols.com>",
    to: repEmail,
    subject: `New message from ${customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">New Message Received</h2>

        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #374151; margin: 0; white-space: pre-wrap;">${truncatedPreview}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;">From:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
            <td style="padding: 8px 0; color: #111827;">${customerPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Chat Mode:</td>
            <td style="padding: 8px 0;">
              <span style="background: ${chatMode === "AI" ? "#f3e8ff" : "#dbeafe"};
                           color: ${chatMode === "AI" ? "#7c3aed" : "#2563eb"};
                           padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                ${modeLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Timestamp:</td>
            <td style="padding: 8px 0; color: #111827;">${timestamp} ET</td>
          </tr>
        </table>

        <p style="margin-top: 24px;">
          <a href="${baseUrl}/admin?conversation=${conversationId}"
             style="display: inline-block; background: #2563eb; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;
                    font-weight: 500;">
            View Conversation
          </a>
        </p>

        <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
          This is an automated notification from JA Protocol Chat.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`New message notification sent successfully, id: ${emailId?.id}`);
}
