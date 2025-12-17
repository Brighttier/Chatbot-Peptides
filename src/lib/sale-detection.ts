import type { SaleChannel } from "@/types";

// Sale-related keywords categorized by confidence level
export const SALE_KEYWORDS = {
  high_confidence: [
    "order confirmed",
    "payment received",
    "payment successful",
    "order placed",
    "purchase complete",
    "order number",
    "confirmation number",
    "shipped",
    "tracking number",
    "payment processed",
    "transaction complete",
    "receipt sent",
    "order is confirmed",
    "payment went through",
  ],
  medium_confidence: [
    "bought",
    "purchased",
    "paid",
    "checkout",
    "credit card",
    "debit card",
    "processed payment",
    "invoice",
    "billing",
    "charged",
    "transaction",
    "completed purchase",
    "finalized order",
    "payment method",
  ],
  low_confidence: [
    "order",
    "buy",
    "payment",
    "price",
    "cost",
    "purchase",
    "total",
    "amount",
    "discount",
    "promo code",
    "coupon",
  ],
};

export type ConfidenceLevel = "high" | "medium" | "low" | null;

export interface KeywordDetectionResult {
  found: boolean;
  keywords: string[];
  confidenceLevel: ConfidenceLevel;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
}

/**
 * Detects sale-related keywords in a message
 * @param content - The message content to analyze
 * @returns Detection result with found keywords and confidence level
 */
export function detectSaleKeywords(content: string): KeywordDetectionResult {
  const contentLower = content.toLowerCase();
  const foundKeywords: string[] = [];
  let highestConfidence: ConfidenceLevel = null;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  // Check high confidence keywords first
  for (const keyword of SALE_KEYWORDS.high_confidence) {
    if (contentLower.includes(keyword)) {
      foundKeywords.push(keyword);
      highestConfidence = "high";
      highCount++;
    }
  }

  // Check medium confidence keywords
  for (const keyword of SALE_KEYWORDS.medium_confidence) {
    if (contentLower.includes(keyword)) {
      foundKeywords.push(keyword);
      if (!highestConfidence) highestConfidence = "medium";
      mediumCount++;
    }
  }

  // Check low confidence keywords
  for (const keyword of SALE_KEYWORDS.low_confidence) {
    if (contentLower.includes(keyword)) {
      foundKeywords.push(keyword);
      if (!highestConfidence) highestConfidence = "low";
      lowCount++;
    }
  }

  return {
    found: foundKeywords.length > 0,
    keywords: [...new Set(foundKeywords)], // Remove duplicates
    confidenceLevel: highestConfidence,
    highConfidenceCount: highCount,
    mediumConfidenceCount: mediumCount,
    lowConfidenceCount: lowCount,
  };
}

/**
 * Determines the sale channel based on user mobile number
 * Direct link (Instagram) chats have userMobileNumber starting with "instagram-"
 * @param userMobileNumber - The user's mobile number or instagram identifier
 * @returns The sale channel ('instagram' or 'website')
 */
export function determineChannel(userMobileNumber: string): SaleChannel {
  return userMobileNumber.startsWith("instagram-") ? "instagram" : "website";
}

/**
 * Gets the commission rate based on the sale channel
 * Website: 10% commission
 * Instagram (direct link): 5% commission
 * @param channel - The sale channel
 * @returns The commission rate as a decimal (0.10 or 0.05)
 */
export function getCommissionRate(channel: SaleChannel): number {
  return channel === "website" ? 0.1 : 0.05;
}

/**
 * Calculates commission amount based on sale amount and channel
 * @param saleAmount - The total sale amount
 * @param channel - The sale channel
 * @returns The commission amount
 */
export function calculateCommission(
  saleAmount: number,
  channel: SaleChannel
): number {
  const rate = getCommissionRate(channel);
  return Math.round(saleAmount * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Extracts context around a keyword for evidence storage
 * @param content - The full message content
 * @param keyword - The keyword to find context for
 * @param contextLength - Number of characters to include on each side
 * @returns The context string
 */
export function extractKeywordContext(
  content: string,
  keyword: string,
  contextLength: number = 50
): string {
  const contentLower = content.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  const index = contentLower.indexOf(keywordLower);

  if (index === -1) return content.slice(0, contextLength * 2);

  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + keyword.length + contextLength);

  let context = content.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = "..." + context;
  if (end < content.length) context = context + "...";

  return context;
}

/**
 * Determines if a message should trigger a potential sale flag
 * Based on confidence level and keyword counts
 * @param result - The keyword detection result
 * @returns Whether to flag as potential sale
 */
export function shouldFlagAsPotentialSale(
  result: KeywordDetectionResult
): boolean {
  // High confidence always flags
  if (result.confidenceLevel === "high") return true;

  // Medium confidence flags if multiple keywords found
  if (result.confidenceLevel === "medium" && result.mediumConfidenceCount >= 2)
    return true;

  // Low confidence only flags if many keywords found (3+)
  if (result.confidenceLevel === "low" && result.lowConfidenceCount >= 3)
    return true;

  return false;
}

/**
 * Determines if a sale record should be auto-created for review
 * Only for high confidence detections
 * @param result - The keyword detection result
 * @returns Whether to create a pending sale record
 */
export function shouldCreatePendingSale(
  result: KeywordDetectionResult
): boolean {
  // Only create pending sale for high confidence with 2+ keywords
  // or medium confidence with 3+ keywords
  if (result.confidenceLevel === "high" && result.highConfidenceCount >= 1) {
    return true;
  }

  if (result.confidenceLevel === "medium" && result.mediumConfidenceCount >= 3) {
    return true;
  }

  return false;
}
