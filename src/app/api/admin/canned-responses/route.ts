import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// GET - Get all canned responses
export async function GET() {
  try {
    const authResult = await requireRole(["super_admin", "admin", "rep"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection("canned_responses")
      .orderBy("title", "asc")
      .get();

    const responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ responses });
  } catch (error) {
    console.error("Error fetching canned responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch canned responses" },
      { status: 500 }
    );
  }
}

// POST - Create a new canned response
export async function POST(request: Request) {
  try {
    const authResult = await requireRole(["super_admin", "admin", "rep"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

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

    // Check for duplicate shortcut
    const existingSnapshot = await db
      .collection("canned_responses")
      .where("shortcut", "==", normalizedShortcut.toLowerCase())
      .get();

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: "This shortcut is already in use" },
        { status: 400 }
      );
    }

    // Create the canned response
    const docRef = await db.collection("canned_responses").add({
      title: title.trim(),
      content: content.trim(),
      shortcut: normalizedShortcut.toLowerCase(),
      category: category || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: authResult.user.uid,
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error("Error creating canned response:", error);
    return NextResponse.json(
      { error: "Failed to create canned response" },
      { status: 500 }
    );
  }
}
