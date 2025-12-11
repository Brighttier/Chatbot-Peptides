import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

// Delete a conversation and all its messages
export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // First, delete all messages in the subcollection
    const messagesRef = db
      .collection("conversations")
      .doc(conversationId)
      .collection("messages");

    const messagesSnapshot = await messagesRef.get();

    // Delete messages in batches (Firestore has a limit of 500 operations per batch)
    const batch = db.batch();
    let deleteCount = 0;

    for (const doc of messagesSnapshot.docs) {
      batch.delete(doc.ref);
      deleteCount++;
    }

    // Commit the batch delete for messages
    if (deleteCount > 0) {
      await batch.commit();
    }

    // Now delete the conversation document itself
    await db.collection("conversations").doc(conversationId).delete();

    return NextResponse.json({
      success: true,
      deletedMessages: deleteCount,
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}

// Delete multiple conversations at once
export async function DELETE(request: NextRequest) {
  try {
    const { conversationIds } = await request.json();

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return NextResponse.json(
        { error: "conversationIds array is required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    let totalDeleted = 0;
    let totalMessagesDeleted = 0;

    for (const conversationId of conversationIds) {
      // Delete all messages in the subcollection
      const messagesRef = db
        .collection("conversations")
        .doc(conversationId)
        .collection("messages");

      const messagesSnapshot = await messagesRef.get();

      const batch = db.batch();
      for (const doc of messagesSnapshot.docs) {
        batch.delete(doc.ref);
        totalMessagesDeleted++;
      }

      if (messagesSnapshot.size > 0) {
        await batch.commit();
      }

      // Delete the conversation document
      await db.collection("conversations").doc(conversationId).delete();
      totalDeleted++;
    }

    return NextResponse.json({
      success: true,
      deletedConversations: totalDeleted,
      deletedMessages: totalMessagesDeleted,
    });
  } catch (error) {
    console.error("Error deleting conversations:", error);
    return NextResponse.json(
      { error: "Failed to delete conversations" },
      { status: 500 }
    );
  }
}
