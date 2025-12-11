"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Phone, Instagram, ArrowRight, Loader2, User, Calendar, CheckCircle2 } from "lucide-react";

interface CustomerData {
  mobileNumber: string;
  instagramHandle?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
}

interface MobileGatewayProps {
  repId: string;
  onSubmit: (data: CustomerData) => Promise<void>;
  showInstagram?: boolean;
}

export function MobileGateway({
  repId,
  onSubmit,
  showInstagram = true,
}: MobileGatewayProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
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

  const validateForm = (): string | null => {
    if (!firstName.trim()) return "Please enter your first name";
    if (!lastName.trim()) return "Please enter your last name";
    if (!dateOfBirth) return "Please enter your date of birth";
    if (!validatePhone(mobileNumber)) return "Please enter a valid 10-digit phone number";
    if (!consentGiven) return "Please agree to the terms to continue";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Convert to E.164 format
      const e164Number = "+1" + mobileNumber.replace(/\D/g, "");
      await onSubmit({
        mobileNumber: e164Number,
        instagramHandle: instagramHandle || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        consentGiven,
      });
    } catch (err) {
      setError("Failed to start chat. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Start a Conversation</h1>
          <p className="text-muted-foreground text-sm">
            Please provide your details to connect with our team
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-sm flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                First Name
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-sm">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setError(""); }}
                required
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="dob" className="text-sm flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date of Birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); setError(""); }}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-sm flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Mobile Number
            </Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="(555) 555-5555"
              value={mobileNumber}
              onChange={handlePhoneChange}
              required
            />
          </div>

          {/* Instagram (optional) */}
          {showInstagram && (
            <div className="space-y-1.5">
              <Label htmlFor="instagram" className="text-sm flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" />
                Instagram <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
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

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <input
              type="checkbox"
              id="consent"
              checked={consentGiven}
              onChange={(e) => { setConsentGiven(e.target.checked); setError(""); }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              I agree to receive communications and understand my information will be used to assist with my inquiry.
            </label>
          </div>

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
      </Card>
    </div>
  );
}
