import twilio from "twilio";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

// Send SMS message
export async function sendSMS(
  to: string,
  from: string,
  body: string
): Promise<string> {
  const client = getTwilioClient();

  const message = await client.messages.create({
    to,
    from,
    body,
  });

  return message.sid;
}

// Send notification SMS to rep when new chat starts
export async function notifyRepNewChat(
  repPhoneNumber: string,
  userPhoneNumber: string,
  initialMessage?: string
): Promise<string> {
  const body = initialMessage
    ? `New chat from ${userPhoneNumber}: "${initialMessage}"`
    : `New chat started from ${userPhoneNumber}`;

  return sendSMS(repPhoneNumber, process.env.TWILIO_PHONE_NUMBER!, body);
}

// Forward user message to rep
export async function forwardMessageToRep(
  repPhoneNumber: string,
  userPhoneNumber: string,
  message: string
): Promise<string> {
  const body = `[${userPhoneNumber}]: ${message}`;

  return sendSMS(repPhoneNumber, process.env.TWILIO_PHONE_NUMBER!, body);
}

// Validate Twilio webhook request
export function validateTwilioRequest(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) {
    throw new Error("Twilio auth token not configured");
  }

  return twilio.validateRequest(authToken, signature, url, params);
}

// ============================================
// Twilio Conversations API Functions
// ============================================

// Create a new Twilio Conversation
export async function createTwilioConversation(
  friendlyName: string
): Promise<string> {
  const client = getTwilioClient();

  const conversation = await client.conversations.v1.conversations.create({
    friendlyName,
  });

  return conversation.sid;
}

// Add SMS participant (rep) to conversation
export async function addSmsParticipant(
  conversationSid: string,
  phoneNumber: string,
  proxyAddress: string
): Promise<string> {
  const client = getTwilioClient();

  const participant = await client.conversations.v1
    .conversations(conversationSid)
    .participants.create({
      "messagingBinding.address": phoneNumber,
      "messagingBinding.proxyAddress": proxyAddress,
    });

  return participant.sid;
}

// Add chat participant (web user) to conversation
export async function addChatParticipant(
  conversationSid: string,
  identity: string
): Promise<string> {
  const client = getTwilioClient();

  const participant = await client.conversations.v1
    .conversations(conversationSid)
    .participants.create({
      identity,
    });

  return participant.sid;
}

// Send message to conversation (includes customer phone in message for SMS visibility)
export async function sendConversationMessage(
  conversationSid: string,
  author: string,
  body: string,
  includeAuthorPrefix: boolean = true
): Promise<string> {
  const client = getTwilioClient();

  // Include author phone number as prefix so rep can see who the message is from
  const messageBody = includeAuthorPrefix ? `[${author}] ${body}` : body;

  const message = await client.conversations.v1
    .conversations(conversationSid)
    .messages.create({
      author,
      body: messageBody,
    });

  return message.sid;
}

// Close/delete a Twilio Conversation
export async function closeTwilioConversation(
  conversationSid: string
): Promise<void> {
  const client = getTwilioClient();

  await client.conversations.v1
    .conversations(conversationSid)
    .update({ state: "closed" });
}
