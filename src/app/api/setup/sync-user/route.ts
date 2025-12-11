import { NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";

// POST - Sync an existing Firebase Auth user to Firestore or create new
export async function POST(request: Request) {
  try {
    const { email, password, name, secretKey, role = "super_admin" } = await request.json();

    // Simple security check - require a secret key
    if (secretKey !== "SETUP_SUPER_ADMIN_2024") {
      return NextResponse.json(
        { error: "Invalid secret key" },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    const auth = getAuth(getAdminApp());

    let authUser;
    let isNewUser = false;

    // Try to get existing user by email
    try {
      authUser = await auth.getUserByEmail(email);
      console.log("Found existing Firebase Auth user:", authUser.uid);

      // If password provided, update it
      if (password) {
        await auth.updateUser(authUser.uid, { password });
        console.log("Updated password for user:", authUser.uid);
      }
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "auth/user-not-found") {
        // User doesn't exist, create new one
        if (!password) {
          return NextResponse.json(
            { error: "Password is required for new users" },
            { status: 400 }
          );
        }

        authUser = await auth.createUser({
          email,
          password,
          displayName: name,
        });
        isNewUser = true;
        console.log("Created new Firebase Auth user:", authUser.uid);
      } else {
        throw err;
      }
    }

    // Check if user document already exists in Firestore
    const existingUserDoc = await db
      .collection("users")
      .where("uid", "==", authUser.uid)
      .limit(1)
      .get();

    if (!existingUserDoc.empty) {
      // Update existing document
      const docId = existingUserDoc.docs[0].id;
      await db.collection("users").doc(docId).update({
        name: name || existingUserDoc.docs[0].data().name,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "User document updated and activated",
        user: {
          id: docId,
          uid: authUser.uid,
          email,
          name: name || existingUserDoc.docs[0].data().name,
          role: existingUserDoc.docs[0].data().role,
        },
      });
    }

    // Create new user document in Firestore
    const userDoc = {
      uid: authUser.uid,
      email,
      name: name || email.split("@")[0],
      role,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("users").add(userDoc);

    return NextResponse.json({
      success: true,
      message: isNewUser
        ? "New user created successfully"
        : "Firebase Auth user synced to Firestore",
      user: {
        id: docRef.id,
        uid: authUser.uid,
        email,
        name: userDoc.name,
        role: userDoc.role,
      },
    });
  } catch (error: unknown) {
    console.error("Sync user error:", error);
    const firebaseError = error as { code?: string; message?: string };
    return NextResponse.json(
      { error: firebaseError.message || "Sync failed" },
      { status: 500 }
    );
  }
}
