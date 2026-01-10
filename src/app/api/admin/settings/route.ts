import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// GET - Get all settings
export async function GET() {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const db = getAdminFirestore();
    const settingsDoc = await db.collection("settings").doc("config").get();

    if (!settingsDoc.exists) {
      // Return default settings if none exist
      return NextResponse.json({
        settings: {
          gemini: {
            apiKey: "",
            modelId: "gemini-2.0-flash-exp",
            persona: "",
            knowledgeBase: "",
            temperature: 0.7,
            maxTokens: 2048,
            isEnabled: true,
          },
          twilio: {
            accountSid: "",
            authToken: "",
            phoneNumber: "",
            isEnabled: true,
          },
          widget: {
            colors: {
              primary: "oklch(0.6 0.2 250)",
              primaryForeground: "oklch(0.98 0 0)",
              accent: "oklch(0.7 0.15 180)",
              background: "oklch(0.98 0 0)",
              foreground: "oklch(0.2 0 0)",
            },
            welcomeMessage: "Hi! How can I help you today?",
            position: "bottom-right",
            autoExpand: false,
            expandDelay: 3000,
            size: "standard",
            borderRadius: 16,
          },
        },
      });
    }

    const data = settingsDoc.data();

    // Mask sensitive fields for non-super_admin users
    if (authResult.user.role !== "super_admin") {
      if (data?.gemini?.apiKey) {
        data.gemini.apiKey = maskValue(data.gemini.apiKey);
      }
      if (data?.twilio?.accountSid) {
        data.twilio.accountSid = maskValue(data.twilio.accountSid);
      }
      if (data?.twilio?.authToken) {
        data.twilio.authToken = maskValue(data.twilio.authToken);
      }
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: Request) {
  try {
    const authResult = await requireRole(["super_admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { gemini, twilio, widget } = body;

    const db = getAdminFirestore();
    const settingsRef = db.collection("settings").doc("config");

    // Get current settings
    const currentDoc = await settingsRef.get();
    const currentSettings = currentDoc.exists ? currentDoc.data() : {};

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authResult.user.uid,
    };

    // Update Gemini settings if provided
    if (gemini !== undefined) {
      updates.gemini = {
        ...currentSettings?.gemini,
        ...gemini,
        // Only update apiKey if a new value is provided (not masked)
        apiKey: gemini.apiKey && !gemini.apiKey.includes("•")
          ? gemini.apiKey
          : currentSettings?.gemini?.apiKey || "",
      };
    }

    // Update Twilio settings if provided
    if (twilio !== undefined) {
      updates.twilio = {
        ...currentSettings?.twilio,
        ...twilio,
        // Only update sensitive fields if new values are provided
        accountSid: twilio.accountSid && !twilio.accountSid.includes("•")
          ? twilio.accountSid
          : currentSettings?.twilio?.accountSid || "",
        authToken: twilio.authToken && !twilio.authToken.includes("•")
          ? twilio.authToken
          : currentSettings?.twilio?.authToken || "",
      };
    }

    // Update widget settings if provided
    if (widget !== undefined) {
      updates.widget = {
        ...currentSettings?.widget,
        ...widget,
        colors: {
          ...currentSettings?.widget?.colors,
          ...widget?.colors,
        },
      };
    }

    // Save to Firestore
    await settingsRef.set(updates, { merge: true });

    // Create audit log
    await db.collection("audit_logs").add({
      action: "settings_updated",
      performedBy: {
        uid: authResult.user.uid,
        email: authResult.user.email,
        name: authResult.user.name,
      },
      timestamp: FieldValue.serverTimestamp(),
      details: {
        description: "Settings updated",
        sections: Object.keys(body).join(", "),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

function maskValue(value: string): string {
  if (!value || value.length < 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}
