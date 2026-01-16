import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { FeedbackStatus } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get a single feedback ticket
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await context.params;
    const db = getAdminFirestore();
    const doc = await db.collection("feedback_tickets").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      ticket: {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
        resolvedAt: data?.resolvedAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Error fetching feedback ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback ticket" },
      { status: 500 }
    );
  }
}

// PUT - Update a feedback ticket (status, notes, etc.)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, adminNotes } = body;

    const db = getAdminFirestore();
    const docRef = db.collection("feedback_tickets").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Update status if provided
    if (status) {
      const validStatuses: FeedbackStatus[] = [
        "open",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;

      // Set resolvedAt if completed or cancelled
      if (status === "completed" || status === "cancelled") {
        updates.resolvedAt = FieldValue.serverTimestamp();
        updates.resolvedBy = {
          uid: authResult.user.uid,
          name: authResult.user.name,
        };
      } else {
        // Clear resolved fields if reopened
        updates.resolvedAt = null;
        updates.resolvedBy = null;
      }
    }

    // Update admin notes if provided
    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes;
    }

    await docRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating feedback ticket:", error);
    return NextResponse.json(
      { error: "Failed to update feedback ticket" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a feedback ticket
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await context.params;
    const db = getAdminFirestore();
    const docRef = db.collection("feedback_tickets").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Delete screenshot from storage if exists
    const screenshotUrl = doc.data()?.screenshotUrl;
    if (screenshotUrl) {
      try {
        const storage = getAdminStorage();
        const bucket = storage.bucket();
        // Extract file path from URL
        const urlParts = screenshotUrl.split("/");
        const fileName = urlParts.slice(urlParts.indexOf("feedback-screenshots")).join("/");
        if (fileName) {
          await bucket.file(fileName).delete();
        }
      } catch (storageError) {
        console.error("Failed to delete screenshot from storage:", storageError);
        // Continue with deletion even if storage delete fails
      }
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting feedback ticket:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback ticket" },
      { status: 500 }
    );
  }
}
