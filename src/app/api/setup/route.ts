import { NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";

// POST - Create initial Super Admin (one-time use)
export async function POST(request: Request) {
  try {
    const { email, password, name, secretKey } = await request.json();

    // Simple security check - require a secret key
    if (secretKey !== "SETUP_SUPER_ADMIN_2024") {
      return NextResponse.json(
        { error: "Invalid secret key" },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    const auth = getAuth(getAdminApp());

    // Check if any users already exist
    const existingUsers = await db.collection("users").limit(1).get();
    if (!existingUsers.empty) {
      return NextResponse.json(
        { error: "Setup already completed. Users already exist." },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth
    const authUser = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create user document in Firestore
    const userDoc = {
      uid: authUser.uid,
      email,
      name,
      role: "super_admin",
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("users").add(userDoc);

    return NextResponse.json({
      success: true,
      message: "Super Admin created successfully",
      user: {
        id: docRef.id,
        uid: authUser.uid,
        email,
        name,
        role: "super_admin",
      },
    });
  } catch (error: unknown) {
    console.error("Setup error:", error);

    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "A user with this email already exists in Firebase Auth" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: firebaseError.message || "Setup failed" },
      { status: 500 }
    );
  }
}
