import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// PUT - Update a canned response
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, shortcut, category } = body;

    // Validate required fields
    if (!title?.trim() || !content?.trim() || !shortcut?.trim()) {
      return NextResponse.json(
        { error: "Title, content, and shortcut are required" },
        { status: 400 }
      );
    }

    // Ensure shortcut starts with /
    const normalizedShortcut = shortcut.startsWith("/") ? shortcut : "/" + shortcut;

    // Validate shortcut format
    if (!/^\/[a-zA-Z0-9-]+$/.test(normalizedShortcut)) {
      return NextResponse.json(
        { error: "Shortcut must start with / and contain only letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const docRef = db.collection("canned_responses").doc(id);

    // Check if document exists
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Canned response not found" },
        { status: 404 }
      );
    }

    // Check for duplicate shortcut (excluding current document)
    const existingSnapshot = await db
      .collection("canned_responses")
      .where("shortcut", "==", normalizedShortcut.toLowerCase())
      .get();

    const isDuplicate = existingSnapshot.docs.some((d) => d.id !== id);
    if (isDuplicate) {
      return NextResponse.json(
        { error: "This shortcut is already in use" },
        { status: 400 }
      );
    }

    // Update the canned response
    await docRef.update({
      title: title.trim(),
      content: content.trim(),
      shortcut: normalizedShortcut.toLowerCase(),
      category: category || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating canned response:", error);
    return NextResponse.json(
      { error: "Failed to update canned response" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a canned response
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;
    const db = getAdminFirestore();
    const docRef = db.collection("canned_responses").doc(id);

    // Check if document exists
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Canned response not found" },
        { status: 404 }
      );
    }

    // Delete the canned response
    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting canned response:", error);
    return NextResponse.json(
      { error: "Failed to delete canned response" },
      { status: 500 }
    );
  }
}
