"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Instagram, ArrowRight, Loader2, User, Calendar } from "lucide-react";

export interface IntakeAnswers {
  goals: string[];
  stage: string;
  interest: string[];
}

export interface CustomerData {
  mobileNumber: string;
  instagramHandle?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
  intakeAnswers?: IntakeAnswers;
}

interface WidgetPhoneInputProps {
  onSubmit: (data: CustomerData) => Promise<void>;
  showInstagram?: boolean;
}

export function WidgetPhoneInput({
  onSubmit,
  showInstagram = false,
}: WidgetPhoneInputProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "");

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
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="text-center mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Your Details</h2>
        <p className="text-xs text-gray-500 mt-1">
          Please provide your information to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-xs flex items-center gap-1 text-gray-700">
                <User className="h-3 w-3" />
                First Name
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                className="h-9 text-sm"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-xs text-gray-700">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setError(""); }}
                className="h-9 text-sm"
                required
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <Label htmlFor="dob" className="text-xs flex items-center gap-1 text-gray-700">
              <Calendar className="h-3 w-3" />
              Date of Birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); setError(""); }}
              max={new Date().toISOString().split("T")[0]}
              className="h-9 text-sm"
              required
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <Label htmlFor="mobile" className="text-xs flex items-center gap-1 text-gray-700">
              <Phone className="h-3 w-3" />
              Mobile Number
            </Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="(555) 555-5555"
              value={mobileNumber}
              onChange={handlePhoneChange}
              className="h-9 text-sm"
              required
            />
          </div>

          {/* Instagram (optional) */}
          {showInstagram && (
            <div className="space-y-1">
              <Label htmlFor="instagram" className="text-xs flex items-center gap-1 text-gray-700">
                <Instagram className="h-3 w-3" />
                Instagram <span className="text-gray-400 font-normal">(optional)</span>
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
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Consent Checkbox */}
          <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="consent"
              checked={consentGiven}
              onChange={(e) => { setConsentGiven(e.target.checked); setError(""); }}
              className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300"
            />
            <label htmlFor="consent" className="text-[11px] text-gray-500 leading-relaxed cursor-pointer">
              I agree to receive communications and understand my information will be used to assist with my inquiry.
            </label>
          </div>

          {error && (
            <p className="text-xs text-red-600 text-center bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        <div className="mt-3">
          <Button
            type="submit"
            className="w-full h-10 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Start Chat
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
