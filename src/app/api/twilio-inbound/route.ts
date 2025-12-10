import { NextRequest, NextResponse } from "next/server";
import {
  findActiveConversationByRepPhoneAdmin,
  addMessageAdmin,
} from "@/lib/firebase-admin";
import { validateTwilioRequest } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio webhook
    const formData = await request.formData();

    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = request.headers.get("X-Twilio-Signature");
      const url = request.url;

      // Convert FormData to plain object for validation
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });

      if (!signature || !validateTwilioRequest(signature, url, params)) {
        console.error("Invalid Twilio signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
    }

    if (!from || !to || !body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // The 'to' number is our Twilio number, 'from' is the rep's number
    // We need to find the active conversation for this rep
    const conversation = await findActiveConversationByRepPhoneAdmin(from, to);

    if (!conversation) {
      console.log(
        `No active conversation found for rep ${from} and user ${to}`
      );
      // Return empty TwiML response
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Add the rep's message to the conversation
    await addMessageAdmin(conversation.id!, "ADMIN", body);

    // Return empty TwiML response (acknowledgment)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("Error processing Twilio inbound:", error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { "Content-Type": "text/xml" },
        status: 500,
      }
    );
  }
}
