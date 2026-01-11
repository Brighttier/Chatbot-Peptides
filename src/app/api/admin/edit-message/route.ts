import { NextRequest, NextResponse } from "next/server";
import { updateMessageAdmin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageId, newContent } = await request.json();

    // TODO: Add admin authentication check here
    // Verify the user is authenticated and has admin role

    if (!conversationId || !messageId || !newContent?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await updateMessageAdmin(conversationId, messageId, newContent.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}
