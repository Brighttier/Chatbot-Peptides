import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(request: Request) {
  // Check authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const db = getAdminFirestore();

    // Get all conversations
    const conversationsSnap = await db.collection("conversations").get();

    // Build unique customer records from conversations
    const customersMap = new Map<string, {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      instagram?: string;
      email?: string;
      dateOfBirth?: string;
      conversationCount: number;
      lastContactDate: Date;
      intakeAnswers?: {
        goals?: string[];
        stage?: string;
        interest?: string[];
      };
    }>();

    conversationsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const phone = data.userMobileNumber;

      if (!phone) return; // Skip if no phone number

      if (!customersMap.has(phone)) {
        // New customer
        customersMap.set(phone, {
          id: phone,
          firstName: data.customerInfo?.firstName || "",
          lastName: data.customerInfo?.lastName || "",
          phone: phone,
          instagram: data.userInstagramHandle?.replace("@", ""),
          email: data.customerInfo?.email,
          dateOfBirth: data.customerInfo?.dateOfBirth,
          conversationCount: 1,
          lastContactDate: data.createdAt?.toDate() || new Date(),
          intakeAnswers: data.customerInfo?.intakeAnswers,
        });
      } else {
        // Existing customer - update count and latest info
        const existing = customersMap.get(phone)!;
        existing.conversationCount++;

        // Update to latest conversation data if this conversation is newer
        const conversationDate = data.createdAt?.toDate() || new Date(0);
        if (conversationDate > existing.lastContactDate) {
          existing.lastContactDate = conversationDate;

          // Update with latest customer info if available
          if (data.customerInfo?.firstName) {
            existing.firstName = data.customerInfo.firstName;
          }
          if (data.customerInfo?.lastName) {
            existing.lastName = data.customerInfo.lastName;
          }
          if (data.userInstagramHandle) {
            existing.instagram = data.userInstagramHandle.replace("@", "");
          }
          if (data.customerInfo?.email) {
            existing.email = data.customerInfo.email;
          }
          if (data.customerInfo?.dateOfBirth) {
            existing.dateOfBirth = data.customerInfo.dateOfBirth;
          }
          if (data.customerInfo?.intakeAnswers) {
            existing.intakeAnswers = data.customerInfo.intakeAnswers;
          }
        }
      }
    });

    // Convert to array and sort by last contact date (newest first)
    const customers = Array.from(customersMap.values())
      .map((customer) => ({
        ...customer,
        lastContactDate: customer.lastContactDate.toISOString(),
      }))
      .sort((a, b) => new Date(b.lastContactDate).getTime() - new Date(a.lastContactDate).getTime());

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
