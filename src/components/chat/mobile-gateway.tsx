"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Phone, Instagram, ArrowRight, Loader2 } from "lucide-react";

interface MobileGatewayProps {
  repId: string;
  onSubmit: (mobileNumber: string, instagramHandle?: string) => Promise<void>;
  showInstagram?: boolean;
}

export function MobileGateway({
  repId,
  onSubmit,
  showInstagram = true,
}: MobileGatewayProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setMobileNumber(formatted);
    setError("");
  };

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(mobileNumber)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Convert to E.164 format
      const e164Number = "+1" + mobileNumber.replace(/\D/g, "");
      await onSubmit(e164Number, instagramHandle || undefined);
    } catch (err) {
      setError("Failed to start chat. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Start a Conversation</h1>
          <p className="text-muted-foreground">
            Enter your mobile number to connect with our team
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="mobile"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Mobile Number
            </label>
            <Input
              id="mobile"
              type="tel"
              placeholder="(555) 555-5555"
              value={mobileNumber}
              onChange={handlePhoneChange}
              className="text-lg"
              required
              autoFocus
            />
          </div>

          {showInstagram && (
            <div className="space-y-2">
              <label
                htmlFor="instagram"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Instagram className="h-4 w-4" />
                Instagram Handle (optional)
              </label>
              <Input
                id="instagram"
                type="text"
                placeholder="@yourhandle"
                value={instagramHandle}
                onChange={(e) => {
                  let value = e.target.value;
                  if (value && !value.startsWith("@")) {
                    value = "@" + value;
                  }
                  setInstagramHandle(value);
                }}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Start Chat
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Your number will be used to maintain your chat history and connect you
          with our representatives.
        </p>
      </Card>
    </div>
  );
}
