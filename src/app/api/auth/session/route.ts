import { NextRequest, NextResponse } from "next/server";
import {
  createSessionCookie,
  verifySessionCookie,
  getUserByUid,
  sessionCookieConfig,
} from "@/lib/auth-admin";
import { cookies } from "next/headers";

// POST - Create a new session (login)
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      );
    }

    // Create session cookie
    const sessionCookie = await createSessionCookie(idToken);

    // Verify and get user details
    const claims = await verifySessionCookie(sessionCookie);
    if (!claims) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // Get user from Firestore
    const user = await getUserByUid(claims.uid);
    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please contact an administrator." },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieConfig.name, sessionCookie, {
      maxAge: sessionCookieConfig.maxAge,
      httpOnly: sessionCookieConfig.httpOnly,
      secure: sessionCookieConfig.secure,
      sameSite: sessionCookieConfig.sameSite,
      path: sessionCookieConfig.path,
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// GET - Get current session
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(sessionCookieConfig.name)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No session found" },
        { status: 401 }
      );
    }

    // Verify session cookie
    const claims = await verifySessionCookie(sessionCookie);
    if (!claims) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // Get user from Firestore
    const user = await getUserByUid(claims.uid);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}

// DELETE - Logout (clear session)
export async function DELETE() {
  try {
    const cookieStore = await cookies();

    // Clear the session cookie
    cookieStore.set(sessionCookieConfig.name, "", {
      maxAge: 0,
      httpOnly: sessionCookieConfig.httpOnly,
      secure: sessionCookieConfig.secure,
      sameSite: sessionCookieConfig.sameSite,
      path: sessionCookieConfig.path,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session deletion error:", error);
    return NextResponse.json(
      { error: "Failed to clear session" },
      { status: 500 }
    );
  }
}
