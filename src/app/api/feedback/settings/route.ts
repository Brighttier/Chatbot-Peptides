import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

// Default settings
const DEFAULT_SETTINGS = {
  isEnabled: false,
  buttonLabel: "Feedback",
  buttonColor: "#8B5CF6",
};

// GET - Public endpoint to check if beta feedback is enabled
export async function GET() {
  try {
    const db = getAdminFirestore();
    const settingsDoc = await db.collection("settings").doc("config").get();

    if (!settingsDoc.exists) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const data = settingsDoc.data();
    const betaFeedback = data?.betaFeedback || DEFAULT_SETTINGS;

    return NextResponse.json({
      isEnabled: betaFeedback.isEnabled ?? false,
      buttonLabel: betaFeedback.buttonLabel || "Feedback",
      buttonColor: betaFeedback.buttonColor || "#8B5CF6",
    });
  } catch (error) {
    console.error("Error fetching feedback settings:", error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
