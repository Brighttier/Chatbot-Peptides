import type { RepMapping } from "@/types";

// Rep ID to phone number mapping
// DEFAULT_REP_PHONE_NUMBER is set via environment secret
// In production, this could be stored in Firestore or another database
const repMapping: RepMapping = {
  // Add your rep mappings here
  // Format: "repId": "+1234567890"
  default: process.env.DEFAULT_REP_PHONE_NUMBER || "+10000000000",
};

export function getRepPhoneNumber(repId: string): string | null {
  return repMapping[repId] || repMapping.default || null;
}

export function isValidRepId(repId: string): boolean {
  return repId in repMapping || repId === "default";
}

// Get rep ID from phone number (reverse lookup for Twilio webhooks)
export function getRepIdFromPhoneNumber(phoneNumber: string): string | null {
  for (const [repId, phone] of Object.entries(repMapping)) {
    if (phone === phoneNumber) {
      return repId;
    }
  }
  return null;
}
