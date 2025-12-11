import { NextRequest, NextResponse } from "next/server";
import { updateConversationAdmin } from "@/lib/firebase-admin";

interface ArchiveConversationRequest {
  conversationId: string;
  archive: boolean; // true to archive, false to unarchive
}

export async function POST(request: NextRequest) {
  try {
    const body: ArchiveConversationRequest = await request.json();
    const { conversationId, archive } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing required field: conversationId" },
        { status: 400 }
      );
    }

    // Update conversation status to archived or ended
    await updateConversationAdmin(conversationId, {
      status: archive ? "archived" : "ended",
    });

    return NextResponse.json({
      success: true,
      status: archive ? "archived" : "ended",
    });
  } catch (error) {
    console.error("Error archiving conversation:", error);
    return NextResponse.json(
      { error: "Failed to archive conversation" },
      { status: 500 }
    );
  }
}
