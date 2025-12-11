import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Merge all conversations from the same phone number into one
export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore();

    // Get all conversations
    const conversationsSnapshot = await db
      .collection("conversations")
      .orderBy("createdAt", "asc")
      .get();

    if (conversationsSnapshot.empty) {
      return NextResponse.json({ message: "No conversations found", merged: 0 });
    }

    // Group conversations by userMobileNumber + repPhoneNumber
    const groupedConversations = new Map<string, Array<{
      id: string;
      data: FirebaseFirestore.DocumentData;
      createdAt: Date;
    }>>();

    conversationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const key = `${data.userMobileNumber}__${data.repPhoneNumber}`;

      if (!groupedConversations.has(key)) {
        groupedConversations.set(key, []);
      }

      const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt);

      groupedConversations.get(key)!.push({
        id: doc.id,
        data,
        createdAt,
      });
    });

    let mergedCount = 0;
    const mergeResults: Array<{
      phoneNumber: string;
      keptConversationId: string;
      deletedConversationIds: string[];
      messagesMoved: number;
    }> = [];

    // Process each group
    for (const [key, conversations] of groupedConversations) {
      if (conversations.length <= 1) {
        continue; // No duplicates to merge
      }

      // Sort by createdAt (oldest first) - keep the oldest conversation
      conversations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      const primaryConversation = conversations[0];
      const duplicates = conversations.slice(1);

      let totalMessagesMoved = 0;

      // Move all messages from duplicates to primary conversation
      for (const duplicate of duplicates) {
        // Get messages from duplicate conversation
        const messagesSnapshot = await db
          .collection("conversations")
          .doc(duplicate.id)
          .collection("messages")
          .orderBy("timestamp", "asc")
          .get();

        // Move each message to primary conversation
        for (const messageDoc of messagesSnapshot.docs) {
          const messageData = messageDoc.data();

          // Add message to primary conversation
          await db
            .collection("conversations")
            .doc(primaryConversation.id)
            .collection("messages")
            .add(messageData);

          // Delete from duplicate
          await messageDoc.ref.delete();
          totalMessagesMoved++;
        }

        // Delete the duplicate conversation document
        await db.collection("conversations").doc(duplicate.id).delete();
      }

      // Update primary conversation to be active if any were active
      const hasActiveConversation = conversations.some(c => c.data.status === "active");
      if (hasActiveConversation) {
        await db.collection("conversations").doc(primaryConversation.id).update({
          status: "active",
        });
      }

      mergedCount++;
      mergeResults.push({
        phoneNumber: primaryConversation.data.userMobileNumber,
        keptConversationId: primaryConversation.id,
        deletedConversationIds: duplicates.map(d => d.id),
        messagesMoved: totalMessagesMoved,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Merged ${mergedCount} groups of duplicate conversations`,
      mergedCount,
      details: mergeResults,
    });
  } catch (error) {
    console.error("Error merging conversations:", error);
    return NextResponse.json(
      { error: "Failed to merge conversations" },
      { status: 500 }
    );
  }
}

// GET - Preview what would be merged without actually merging
export async function GET() {
  try {
    const db = getAdminFirestore();

    // Get all conversations
    const conversationsSnapshot = await db
      .collection("conversations")
      .orderBy("createdAt", "asc")
      .get();

    if (conversationsSnapshot.empty) {
      return NextResponse.json({ message: "No conversations found", duplicates: [] });
    }

    // Group conversations by userMobileNumber + repPhoneNumber
    const groupedConversations = new Map<string, Array<{
      id: string;
      userMobileNumber: string;
      repPhoneNumber: string;
      status: string;
      chatMode: string;
      createdAt: Date;
    }>>();

    conversationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const key = `${data.userMobileNumber}__${data.repPhoneNumber}`;

      if (!groupedConversations.has(key)) {
        groupedConversations.set(key, []);
      }

      const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt);

      groupedConversations.get(key)!.push({
        id: doc.id,
        userMobileNumber: data.userMobileNumber,
        repPhoneNumber: data.repPhoneNumber,
        status: data.status,
        chatMode: data.chatMode,
        createdAt,
      });
    });

    // Find groups with duplicates
    const duplicateGroups: Array<{
      phoneNumber: string;
      conversationCount: number;
      conversations: Array<{
        id: string;
        status: string;
        chatMode: string;
        createdAt: Date;
        willBeKept: boolean;
      }>;
    }> = [];

    for (const [, conversations] of groupedConversations) {
      if (conversations.length > 1) {
        // Sort by createdAt (oldest first)
        conversations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        duplicateGroups.push({
          phoneNumber: conversations[0].userMobileNumber,
          conversationCount: conversations.length,
          conversations: conversations.map((c, index) => ({
            id: c.id,
            status: c.status,
            chatMode: c.chatMode,
            createdAt: c.createdAt,
            willBeKept: index === 0, // First (oldest) will be kept
          })),
        });
      }
    }

    return NextResponse.json({
      totalConversations: conversationsSnapshot.size,
      duplicateGroupsCount: duplicateGroups.length,
      totalDuplicatesToRemove: duplicateGroups.reduce((sum, g) => sum + g.conversationCount - 1, 0),
      duplicateGroups,
    });
  } catch (error) {
    console.error("Error previewing merge:", error);
    return NextResponse.json(
      { error: "Failed to preview merge" },
      { status: 500 }
    );
  }
}
