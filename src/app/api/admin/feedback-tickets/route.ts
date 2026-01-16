import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { FeedbackStatus } from "@/types";

// GET - List all feedback tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as FeedbackStatus | "all" | null;

    const db = getAdminFirestore();
    let query = db.collection("feedback_tickets").orderBy("createdAt", "desc");

    // Apply status filter if provided and not "all"
    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();

    const tickets = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Get count by status
    const allTickets = await db.collection("feedback_tickets").get();
    const statusCounts = {
      all: allTickets.size,
      open: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    allTickets.docs.forEach((doc) => {
      const ticketStatus = doc.data().status as FeedbackStatus;
      if (ticketStatus in statusCounts) {
        statusCounts[ticketStatus]++;
      }
    });

    return NextResponse.json({ tickets, statusCounts });
  } catch (error) {
    console.error("Error fetching feedback tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback tickets" },
      { status: 500 }
    );
  }
}

// POST - Create a new feedback ticket (admin-created)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { type, title, description, reporterName, reporterEmail, status } = body;

    // Validate
    if (!type || !["bug", "feature", "other"].includes(type)) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const db = getAdminFirestore();

    const ticketData = {
      type,
      title: title.trim(),
      description: description?.trim() || "",
      reporterName: reporterName?.trim() || authResult.user.name,
      reporterEmail: reporterEmail?.trim()?.toLowerCase() || authResult.user.email,
      screenshotUrl: null,
      status: status || "open",
      adminNotes: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: authResult.user.uid,
    };

    const docRef = await db.collection("feedback_tickets").add(ticketData);

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
    });
  } catch (error) {
    console.error("Error creating feedback ticket:", error);
    return NextResponse.json(
      { error: "Failed to create feedback ticket" },
      { status: 500 }
    );
  }
}
