"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export interface ParentUserData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
}

interface PostMessageData {
  type: string;
  payload: Partial<ParentUserData>;
}

const ALLOWED_ORIGINS = process.env.NEXT_PUBLIC_ALLOWED_EMBED_ORIGINS?.split(",").map(o => o.trim()) || [];

/**
 * Hook to receive user data from URL parameters or parent window postMessage.
 * - URL params: Used when chat opens as a popup window
 * - postMessage: Used when chat is embedded in an iframe
 *
 * @returns User data if available, null otherwise
 */
export function useParentUserData(): {
  userData: ParentUserData | null;
  isLoading: boolean;
  hasCompleteData: boolean;
} {
  const searchParams = useSearchParams();
  const [userData, setUserData] = useState<ParentUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // First, check URL parameters (for popup window approach)
    const urlData = getDataFromURLParams(searchParams);

    if (urlData && hasAnyData(urlData)) {
      console.log("[useParentUserData] Found user data in URL params:", {
        hasFirstName: !!urlData.firstName,
        hasLastName: !!urlData.lastName,
        hasPhone: !!urlData.phone,
        hasEmail: !!urlData.email,
        hasDOB: !!urlData.dateOfBirth,
      });
      setUserData(urlData);
      setIsLoading(false);
      return; // No need to listen for postMessage if we have URL params
    }

    // If no URL params, set up postMessage listener (for iframe approach)
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Wait max 2 seconds for parent data

    const handleMessage = (event: MessageEvent<PostMessageData>) => {
      // Validate origin if allowed origins are configured
      if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(event.origin)) {
        console.warn("[useParentUserData] Rejected message from unauthorized origin:", event.origin);
        return;
      }

      // Check message type
      if (event.data?.type !== "PEPTIDE_CHAT_USER_DATA") {
        return;
      }

      const payload = event.data.payload;
      if (!payload || typeof payload !== "object") {
        console.warn("[useParentUserData] Invalid payload received");
        return;
      }

      // Normalize and validate data
      const normalizedData: ParentUserData = {
        firstName: sanitizeString(payload.firstName),
        lastName: sanitizeString(payload.lastName),
        phone: normalizePhone(payload.phone),
        email: sanitizeString(payload.email),
        dateOfBirth: sanitizeString(payload.dateOfBirth),
      };

      console.log("[useParentUserData] Received user data from postMessage:", {
        origin: event.origin,
        hasFirstName: !!normalizedData.firstName,
        hasLastName: !!normalizedData.lastName,
        hasPhone: !!normalizedData.phone,
        hasEmail: !!normalizedData.email,
        hasDOB: !!normalizedData.dateOfBirth,
      });

      setUserData(normalizedData);
      setIsLoading(false);
      clearTimeout(timeout);
    };

    window.addEventListener("message", handleMessage);

    // Signal to parent that we're ready to receive data (for iframe)
    if (window.parent !== window) {
      try {
        window.parent.postMessage({ type: "PEPTIDE_CHAT_READY" }, "*");
      } catch {
        // Ignore errors when posting to parent
      }
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, [searchParams]);

  // Check if we have all required fields for auto-skip
  const hasCompleteData = !!(
    userData?.firstName &&
    userData?.lastName &&
    userData?.phone &&
    userData?.dateOfBirth
  );

  return { userData, isLoading, hasCompleteData };
}

/**
 * Sanitize string input - remove leading/trailing whitespace
 */
function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/**
 * Normalize phone number to just digits (will be formatted by the form)
 */
function normalizePhone(value: unknown): string {
  if (typeof value !== "string") return "";
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  // If it starts with country code 1 and has 11 digits, remove the leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Extract user data from URL search parameters
 */
function getDataFromURLParams(searchParams: URLSearchParams): ParentUserData {
  return {
    firstName: sanitizeString(searchParams.get("firstName")),
    lastName: sanitizeString(searchParams.get("lastName")),
    phone: normalizePhone(searchParams.get("phone")),
    email: sanitizeString(searchParams.get("email")),
    dateOfBirth: sanitizeString(searchParams.get("dateOfBirth")),
  };
}

/**
 * Check if any user data fields are populated
 */
function hasAnyData(data: ParentUserData): boolean {
  return !!(data.firstName || data.lastName || data.phone || data.email || data.dateOfBirth);
}
