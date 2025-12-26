import { NextRequest, NextResponse } from "next/server";
import {
  createSaleAdmin,
  listSalesAdmin,
  getConversationAdmin,
  updateConversationSaleInfoAdmin,
  createSaleEvidenceAdmin,
  createSaleAuditLogAdmin,
  getConversationMessagesAdmin,
  getRepByPhoneNumberAdmin,
} from "@/lib/firebase-admin";
import { requireRole, getSession } from "@/lib/auth-admin";
import {
  determineChannel,
  getCommissionRate,
  calculateCommission,
  extractKeywordContext,
  detectSaleKeywords,
} from "@/lib/sale-detection";
import { Timestamp } from "firebase-admin/firestore";
import type { Sale, SaleChannel, SaleStatus } from "@/types";

interface CreateSaleRequest {
  conversationId: string;
  saleAmount: number;
  productDetails?: string;
  saleDate?: string; // ISO date string
  notes?: string;
}

// GET - List sales (Super Admin only)
export async function GET(request: NextRequest) {
  // Only super_admin can view all sales
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { sales, total } = await listSalesAdmin({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      channel: channel || undefined,
      status: status || undefined,
      limit,
      offset,
    });

    return NextResponse.json({ sales, total });
  } catch (error) {
    console.error("Error listing sales:", error);
    return NextResponse.json(
      { error: "Failed to list sales" },
      { status: 500 }
    );
  }
}

// POST - Create/Mark a sale (Any authenticated user)
export async function POST(request: NextRequest) {
  // Any admin/rep can mark a sale
  const authResult = await requireRole(["super_admin", "admin", "rep"]);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const body: CreateSaleRequest = await request.json();
    const { conversationId, saleAmount, productDetails, saleDate, notes } = body;

    if (!conversationId || !saleAmount || saleAmount <= 0) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId and saleAmount (> 0)" },
        { status: 400 }
      );
    }

    // Get conversation details
    const conversation = await getConversationAdmin(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Determine channel and commission
    const channel = determineChannel(conversation.userMobileNumber);
    const commissionRate = getCommissionRate(channel);
    const commissionAmount = calculateCommission(saleAmount, channel);

    // Get rep info
    let repInfo: Sale["repInfo"] = {
      name: "Unknown Rep",
      phoneNumber: conversation.repPhoneNumber,
    };

    const repData = await getRepByPhoneNumberAdmin(conversation.repPhoneNumber);
    if (repData) {
      repInfo = {
        name: repData.name,
        repId: repData.repId,
        phoneNumber: conversation.repPhoneNumber,
      };
    }

    // Get customer name
    const customerName =
      conversation.customerInfo?.firstName && conversation.customerInfo?.lastName
        ? `${conversation.customerInfo.firstName} ${conversation.customerInfo.lastName}`
        : conversation.customerInfo?.firstName || "Unknown Customer";

    // Create sale record - filter out undefined values for Firestore
    const saleData: Omit<Sale, "id" | "createdAt" | "updatedAt"> = {
      conversationId,
      customerName,
      customerPhone: conversation.userMobileNumber,
      ...(conversation.userInstagramHandle && { customerInstagram: conversation.userInstagramHandle }),
      channel,
      commissionRate,
      saleAmount,
      commissionAmount,
      productDetails: productDetails || "",
      status: "pending_review", // All sales start as pending review
      detectionMethod: "manual",
      markedBy: {
        uid: user.uid,
        name: user.name,
        role: user.role,
      },
      repInfo,
      saleDate: saleDate
        ? Timestamp.fromDate(new Date(saleDate))
        : Timestamp.now(),
      ...(notes && { notes }),
    };

    const saleId = await createSaleAdmin(saleData);

    // Update conversation with sale info
    await updateConversationSaleInfoAdmin(conversationId, {
      hasPotentialSale: true,
      saleStatus: "marked",
      saleId,
    });

    // Create evidence from conversation messages
    const messages = await getConversationMessagesAdmin(conversationId);
    const transcriptSnapshot = messages.map((m) => ({
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
    }));

    // Find keywords in messages for evidence
    const keywordsFound: { keyword: string; messageId: string; context: string }[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;
      const detection = detectSaleKeywords(msg.content);
      for (const keyword of detection.keywords) {
        keywordsFound.push({
          keyword,
          messageId: msg.id,
          context: extractKeywordContext(msg.content, keyword),
        });
      }
    }

    await createSaleEvidenceAdmin({
      saleId,
      conversationId,
      messageIds: messages.map((m) => m.id!).filter(Boolean),
      transcriptSnapshot,
      keywordsFound,
    });

    // Create audit log
    await createSaleAuditLogAdmin({
      saleId,
      action: "created",
      performedBy: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      reason: "Manual sale marking",
    });

    return NextResponse.json({
      success: true,
      saleId,
      channel,
      commissionRate,
      commissionAmount,
    });
  } catch (error) {
    console.error("Error creating sale:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create sale: ${errorMessage}` },
      { status: 500 }
    );
  }
}
