import { NextRequest, NextResponse } from "next/server";
import { listSalesAdmin, getSaleEvidenceAdmin } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/auth-admin";
import type { SaleChannel, SaleStatus } from "@/types";

// GET - Export sales as CSV (Super Admin only)
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const channel = searchParams.get("channel") as SaleChannel | null;
    const status = searchParams.get("status") as SaleStatus | null;
    const includeEvidence = searchParams.get("includeEvidence") === "true";

    // Get all sales (no pagination for export)
    const { sales } = await listSalesAdmin({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      channel: channel || undefined,
      status: status || undefined,
      limit: 10000, // High limit for export
    });

    // Build CSV header
    const headers = [
      "Sale ID",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Customer Instagram",
      "Channel",
      "Sale Amount",
      "Commission Rate",
      "Commission Amount",
      "Status",
      "Detection Method",
      "Rep Name",
      "Rep Phone",
      "Product Details",
      "Notes",
      "Verified By",
      "Verified At",
      "Conversation ID",
    ];

    if (includeEvidence) {
      headers.push("Keywords Found", "Message Count");
    }

    // Build CSV rows
    const rows: string[][] = [];

    for (const sale of sales) {
      const row = [
        sale.id || "",
        sale.saleDate?.toDate?.()?.toISOString() || "",
        sale.customerName,
        sale.customerPhone,
        sale.customerInstagram || "",
        sale.channel,
        sale.saleAmount.toFixed(2),
        (sale.commissionRate * 100).toFixed(0) + "%",
        sale.commissionAmount.toFixed(2),
        sale.status,
        sale.detectionMethod,
        sale.repInfo.name,
        sale.repInfo.phoneNumber,
        (sale.productDetails || "").replace(/,/g, ";"), // Escape commas
        (sale.notes || "").replace(/,/g, ";"),
        sale.verifiedBy?.name || "",
        sale.verifiedAt?.toDate?.()?.toISOString() || "",
        sale.conversationId,
      ];

      if (includeEvidence && sale.id) {
        const evidence = await getSaleEvidenceAdmin(sale.id);
        if (evidence) {
          row.push(
            evidence.keywordsFound.map((k) => k.keyword).join("; "),
            evidence.transcriptSnapshot.length.toString()
          );
        } else {
          row.push("", "0");
        }
      }

      rows.push(row);
    }

    // Generate CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Return as downloadable CSV
    const filename = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting sales:", error);
    return NextResponse.json(
      { error: "Failed to export sales" },
      { status: 500 }
    );
  }
}
