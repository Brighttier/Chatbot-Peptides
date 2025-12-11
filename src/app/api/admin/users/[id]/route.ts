import { NextRequest, NextResponse } from "next/server";
import {
  requireRole,
  updateUser,
  deleteUser,
} from "@/lib/auth-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { User, UserRole } from "@/types";

// GET - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireRole(["super_admin", "admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(id).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = { id: userDoc.id, ...userDoc.data() } as User;

    return NextResponse.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        repId: user.repId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT - Update a user (Super Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireRole(["super_admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { email, password, name, role, phoneNumber, repId, isActive } = body;

    // Build update object with only provided fields
    const updates: Partial<{
      email: string;
      password: string;
      name: string;
      role: UserRole;
      phoneNumber: string;
      repId: string;
      isActive: boolean;
    }> = {};

    if (email !== undefined) updates.email = email;
    if (password !== undefined && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updates.password = password;
    }
    if (name !== undefined) updates.name = name;
    if (role !== undefined) {
      const validRoles: UserRole[] = ["super_admin", "admin", "rep"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: "Invalid role" },
          { status: 400 }
        );
      }
      updates.role = role;
    }
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (repId !== undefined) updates.repId = repId;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await updateUser(id, updates);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating user:", error);

    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }
    if (firebaseError.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user (Super Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireRole(["super_admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Prevent self-deletion
    if (authResult.user.uid) {
      const db = getAdminFirestore();
      const userDoc = await db.collection("users").doc(id).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.uid === authResult.user.uid) {
          return NextResponse.json(
            { error: "You cannot delete your own account" },
            { status: 400 }
          );
        }
      }
    }

    await deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);

    const errorObj = error as { message?: string };
    if (errorObj.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
