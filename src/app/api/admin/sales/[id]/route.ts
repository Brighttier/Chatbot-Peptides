import { NextRequest, NextResponse } from "next/server";
import {
  getSaleByIdAdmin,
  updateSaleAdmin,
  getSaleEvidenceAdmin,
  getSaleAuditLogsAdmin,
  createSaleAuditLogAdmin,
  updateConversationSaleInfoAdmin,
} from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { SaleStatus } from "@/types";

interface UpdateSaleRequest {
  status?: SaleStatus;
  saleAmount?: number;
  notes?: string;
  reason?: string; // Required for status changes
}

// GET - Get sale details with evidence (Super Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(["super_admin"]);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { id } = await params;

    const sale = await getSaleByIdAdmin(id);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Get evidence and audit logs
    const evidence = await getSaleEvidenceAdmin(id);
    const auditLogs = await getSaleAuditLogsAdmin(id);

    return NextResponse.json({
      sale,
      evidence,
      auditLogs,
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}

// PUT - Update sale (verify, dispute, etc.) (Super Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(["super_admin"]);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const { id } = await params;
    const body: UpdateSaleRequest = await request.json();
    const { status, saleAmount, notes, reason } = body;

    const existingSale = await getSaleByIdAdmin(id);
    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Require reason for status changes
    if (status && status !== existingSale.status && !reason) {
      return NextResponse.json(
        { error: "Reason is required for status changes" },
        { status: 400 }
      );
    }

    // Build updates
    const updates: Record<string, unknown> = {};
    let auditAction: "verified" | "disputed" | "rejected" | "amount_changed" = "verified";

    if (status) {
      updates.status = status;
      if (status === "verified") {
        updates.verifiedAt = Timestamp.now();
        updates.verifiedBy = { uid: user.uid, name: user.name };
        auditAction = "verified";

        // Update conversation sale status
        await updateConversationSaleInfoAdmin(existingSale.conversationId, {
          saleStatus: "verified",
        });
      } else if (status === "disputed") {
        auditAction = "disputed";
        // Store dispute reason on the sale for easy access
        if (reason) {
          updates.disputeReason = reason;
          updates.disputedAt = Timestamp.now();
          updates.disputedBy = { uid: user.uid, name: user.name };
        }
      } else if (status === "rejected") {
        auditAction = "rejected";

        // Clear sale from conversation
        await updateConversationSaleInfoAdmin(existingSale.conversationId, {
          saleStatus: null,
          saleId: undefined,
        });
      }
    }

    if (saleAmount !== undefined && saleAmount !== existingSale.saleAmount) {
      updates.saleAmount = saleAmount;
      // Recalculate commission
      updates.commissionAmount = Math.round(saleAmount * existingSale.commissionRate * 100) / 100;
      auditAction = "amount_changed";
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    // Apply updates
    await updateSaleAdmin(id, updates);

    // Create audit log
    await createSaleAuditLogAdmin({
      saleId: id,
      action: auditAction,
      performedBy: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      previousValue: {
        status: existingSale.status,
        saleAmount: existingSale.saleAmount,
      },
      newValue: {
        status: status || existingSale.status,
        saleAmount: saleAmount || existingSale.saleAmount,
      },
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  }
}
