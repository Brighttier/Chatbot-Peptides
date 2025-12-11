import { NextRequest, NextResponse } from "next/server";
import {
  requireRole,
  getAllUsers,
  createUser,
} from "@/lib/auth-admin";
import type { UserRole } from "@/types";

// GET - List all users (Admin+ can view)
export async function GET() {
  try {
    const authResult = await requireRole(["super_admin", "admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const users = await getAllUsers();

    // Remove sensitive info and return
    const safeUsers = users.map((user) => ({
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
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Create a new user (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(["super_admin"]);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { email, password, name, role, phoneNumber, repId } = body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Email, password, name, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ["super_admin", "admin", "rep"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be super_admin, admin, or rep" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // For reps, require phone number
    if (role === "rep" && !phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required for rep accounts" },
        { status: 400 }
      );
    }

    // Create the user
    const newUser = await createUser({
      email,
      password,
      name,
      role,
      phoneNumber,
      repId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        uid: newUser.uid,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        repId: newUser.repId,
        isActive: newUser.isActive,
      },
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    // Handle Firebase Auth errors
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }
    if (firebaseError.code === "auth/invalid-email") {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
