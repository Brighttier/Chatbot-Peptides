"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Phone, Instagram, ArrowRight, Loader2, User, Calendar, CheckCircle2 } from "lucide-react";

interface IntakeAnswers {
  goals: string[];
  stage: string;
  interest: string[];
}

interface CustomerData {
  mobileNumber: string;
  instagramHandle?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  consentGiven: boolean;
  intakeAnswers?: IntakeAnswers;
}

// Intake question options
const GOAL_OPTIONS = ["Muscle Growth", "Anti-Aging", "Recovery", "Other"];
const STAGE_OPTIONS = ["Starting a Protocol", "Optimizing Existing Protocol", "Just Researching"];
const INTEREST_OPTIONS = ["Purchasing Peptides", "Coaching Services", "Personalized Advice"];

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

  // Intake questions state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

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

      // Build intake answers if any were provided
      const intakeAnswers: IntakeAnswers | undefined =
        selectedGoals.length > 0 || selectedStage || selectedInterests.length > 0
          ? {
              goals: selectedGoals,
              stage: selectedStage,
              interest: selectedInterests,
            }
          : undefined;

      await onSubmit({
        mobileNumber: e164Number,
        instagramHandle: instagramHandle || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        consentGiven,
        intakeAnswers,
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

          {/* Intake Questions */}
          <div className="space-y-4 pt-2 border-t">
            <p className="text-sm font-medium text-center text-muted-foreground">Quick Questions</p>

            {/* Q1: Goals */}
            <div className="space-y-2">
              <Label className="text-sm">What results are you hoping to achieve?</Label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <label
                    key={goal}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      selectedGoals.includes(goal)
                        ? "bg-primary/10 border-primary"
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGoals.includes(goal)}
                      onChange={() => toggleGoal(goal)}
                      className="h-3.5 w-3.5 rounded"
                    />
                    {goal}
                  </label>
                ))}
              </div>
            </div>

            {/* Q2: Stage */}
            <div className="space-y-2">
              <Label className="text-sm">Where are you in your journey?</Label>
              <div className="space-y-1.5">
                {STAGE_OPTIONS.map((stage) => (
                  <label
                    key={stage}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      selectedStage === stage
                        ? "bg-primary/10 border-primary"
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="stage"
                      checked={selectedStage === stage}
                      onChange={() => setSelectedStage(stage)}
                      className="h-3.5 w-3.5"
                    />
                    {stage}
                  </label>
                ))}
              </div>
            </div>

            {/* Q3: Interest */}
            <div className="space-y-2">
              <Label className="text-sm">What are you interested in?</Label>
              <div className="space-y-1.5">
                {INTEREST_OPTIONS.map((interest) => (
                  <label
                    key={interest}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      selectedInterests.includes(interest)
                        ? "bg-primary/10 border-primary"
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInterests.includes(interest)}
                      onChange={() => toggleInterest(interest)}
                      className="h-3.5 w-3.5 rounded"
                    />
                    {interest}
                  </label>
                ))}
              </div>
            </div>
          </div>

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
