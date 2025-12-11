import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";

// POST - Test connection to HeyGen or Twilio
export async function POST(request: Request) {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { service } = await request.json();

    if (!service || !["heygen", "twilio"].includes(service)) {
      return NextResponse.json(
        { error: "Invalid service specified" },
        { status: 400 }
      );
    }

    // Get current settings
    const db = getAdminFirestore();
    const settingsDoc = await db.collection("settings").doc("config").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;

    if (service === "heygen") {
      const apiKey = settings?.heygen?.apiKey || process.env.HEYGEN_API_KEY;

      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: "HeyGen API key not configured",
        });
      }

      try {
        // Test HeyGen API by fetching avatars list
        const response = await fetch("https://api.heygen.com/v2/avatars", {
          headers: {
            "X-Api-Key": apiKey,
          },
        });

        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: "HeyGen connection successful",
          });
        } else {
          const error = await response.text();
          return NextResponse.json({
            success: false,
            error: `HeyGen API error: ${error}`,
          });
        }
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `Failed to connect to HeyGen: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    }

    if (service === "twilio") {
      const accountSid = settings?.twilio?.accountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken = settings?.twilio?.authToken || process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        return NextResponse.json({
          success: false,
          error: "Twilio credentials not configured",
        });
      }

      try {
        // Test Twilio API by fetching account info
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
          {
            headers: {
              Authorization:
                "Basic " +
                Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            success: true,
            message: `Twilio connection successful. Account: ${data.friendly_name}`,
          });
        } else {
          const error = await response.text();
          return NextResponse.json({
            success: false,
            error: `Twilio API error: ${error}`,
          });
        }
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `Failed to connect to Twilio: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    }

    return NextResponse.json({ success: false, error: "Unknown service" });
  } catch (error) {
    console.error("Error testing connection:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}
