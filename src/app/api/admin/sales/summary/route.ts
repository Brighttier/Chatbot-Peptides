import { NextRequest, NextResponse } from "next/server";
import { getCommissionSummaryAdmin } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth-admin";

// GET - Get commission summary (Super Admin only)
export async function GET(request: NextRequest) {
  const authResult = await requireRole(["super_admin"]);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Default to current month if no dates provided
    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month

    const summary = await getCommissionSummaryAdmin(startDate, endDate);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching commission summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch commission summary" },
      { status: 500 }
    );
  }
}
