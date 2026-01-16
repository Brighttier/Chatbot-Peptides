import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, description, reporterName, reporterEmail, screenshot } = body;

    // Validate required fields
    if (!type || !["bug", "feature", "other"].includes(type)) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!reporterName?.trim()) {
      return NextResponse.json({ error: "Reporter name is required" }, { status: 400 });
    }
    if (!reporterEmail?.trim() || !reporterEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Check if beta feedback is enabled
    const settingsDoc = await db.collection("settings").doc("config").get();
    const betaFeedback = settingsDoc.data()?.betaFeedback;

    if (!betaFeedback?.isEnabled) {
      return NextResponse.json(
        { error: "Beta feedback is currently disabled" },
        { status: 403 }
      );
    }

    // Upload screenshot if provided
    let screenshotUrl: string | undefined;
    if (screenshot && screenshot.startsWith("data:image")) {
      try {
        const storage = getAdminStorage();
        const bucket = storage.bucket();

        // Extract base64 data
        const matches = screenshot.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const extension = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");

          // Generate unique filename
          const fileName = `feedback-screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
          const file = bucket.file(fileName);

          // Upload file
          await file.save(buffer, {
            metadata: {
              contentType: `image/${extension}`,
            },
          });

          // Make file publicly accessible
          await file.makePublic();

          // Get public URL
          screenshotUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        }
      } catch (uploadError) {
        console.error("Failed to upload screenshot:", uploadError);
        // Continue without screenshot rather than failing the whole submission
      }
    }

    // Create the feedback ticket document
    const ticketData = {
      type,
      title: title.trim(),
      description: description.trim(),
      reporterName: reporterName.trim(),
      reporterEmail: reporterEmail.trim().toLowerCase(),
      screenshotUrl: screenshotUrl || null,
      status: "open",
      adminNotes: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("feedback_tickets").add(ticketData);

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again." },
      { status: 500 }
    );
  }
}
