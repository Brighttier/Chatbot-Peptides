import { NextRequest, NextResponse } from "next/server";
import { markConversationAsReadAdmin } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-admin";

interface MarkReadRequest {
  conversationId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getSession();
    if (!session?.uid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: MarkReadRequest = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing required field: conversationId" },
        { status: 400 }
      );
    }

    // Mark conversation as read for the current user
    await markConversationAsReadAdmin(conversationId, session.uid);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return NextResponse.json(
      { error: "Failed to mark conversation as read" },
      { status: 500 }
    );
  }
}
