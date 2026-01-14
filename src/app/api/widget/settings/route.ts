import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

// GET - Get public widget settings (no auth required)
export async function GET() {
  try {
    const db = getAdminFirestore();
    const settingsDoc = await db.collection("settings").doc("config").get();

    if (!settingsDoc.exists) {
      // Return default settings
      return NextResponse.json({
        settings: {
          colors: {
            primary: "#2563eb",
            primaryForeground: "#ffffff",
            accent: "#3b82f6",
            background: "#ffffff",
            foreground: "#1f2937",
          },
          welcomeMessage: "Hi! How can I help you today?",
          position: "bottom-right",
          autoExpand: false,
          expandDelay: 3000,
          size: "standard",
          borderRadius: 16,
          bubbleLabel: "Chat with our protocol concierge now",
        },
      });
    }

    const data = settingsDoc.data();

    // Only return widget settings (no sensitive data)
    return NextResponse.json({
      settings: {
        colors: data?.widget?.colors || {
          primary: "#2563eb",
          primaryForeground: "#ffffff",
          accent: "#3b82f6",
          background: "#ffffff",
          foreground: "#1f2937",
        },
        welcomeMessage: data?.widget?.welcomeMessage || "Hi! How can I help you today?",
        position: data?.widget?.position || "bottom-right",
        autoExpand: data?.widget?.autoExpand || false,
        expandDelay: data?.widget?.expandDelay || 3000,
        size: data?.widget?.size || "standard",
        borderRadius: data?.widget?.borderRadius || 16,
        logo: data?.widget?.logo,
        bubbleLabel: data?.widget?.bubbleLabel ?? "Chat with our protocol concierge now",
      },
    });
  } catch (error) {
    console.error("Error fetching widget settings:", error);
    // Return defaults on error
    return NextResponse.json({
      settings: {
        colors: {
          primary: "#2563eb",
          primaryForeground: "#ffffff",
          accent: "#3b82f6",
          background: "#ffffff",
          foreground: "#1f2937",
        },
        welcomeMessage: "Hi! How can I help you today?",
        position: "bottom-right",
        autoExpand: false,
        expandDelay: 3000,
        size: "standard",
        borderRadius: 16,
        bubbleLabel: "Chat with our protocol concierge now",
      },
    });
  }
}
