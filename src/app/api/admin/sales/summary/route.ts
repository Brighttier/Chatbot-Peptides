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
    let startDate: Date;
    let endDate: Date;

    if (startDateStr) {
      // Parse as local date (YYYY-MM-DD) to avoid timezone issues
      const [year, month, day] = startDateStr.split("-").map(Number);
      startDate = new Date(year, month - 1, day, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    if (endDateStr) {
      // Parse as local date and set to end of day
      const [year, month, day] = endDateStr.split("-").map(Number);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

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
