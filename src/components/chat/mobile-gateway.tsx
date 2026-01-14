"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Instagram, ArrowRight, ArrowLeft, Loader2, User, Calendar } from "lucide-react";

// Country codes for the dropdown
const COUNTRY_CODES = [
  { code: "+1", name: "US", flag: "🇺🇸" },
  { code: "+1", name: "CA", flag: "🇨🇦" },
  { code: "+44", name: "UK", flag: "🇬🇧" },
  { code: "+91", name: "IN", flag: "🇮🇳" },
  { code: "+61", name: "AU", flag: "🇦🇺" },
  { code: "+49", name: "DE", flag: "🇩🇪" },
  { code: "+33", name: "FR", flag: "🇫🇷" },
  { code: "+81", name: "JP", flag: "🇯🇵" },
  { code: "+86", name: "CN", flag: "🇨🇳" },
  { code: "+52", name: "MX", flag: "🇲🇽" },
  { code: "+55", name: "BR", flag: "🇧🇷" },
  { code: "+34", name: "ES", flag: "🇪🇸" },
  { code: "+39", name: "IT", flag: "🇮🇹" },
  { code: "+31", name: "NL", flag: "🇳🇱" },
  { code: "+65", name: "SG", flag: "🇸🇬" },
  { code: "+971", name: "AE", flag: "🇦🇪" },
  { code: "+972", name: "IL", flag: "🇮🇱" },
  { code: "+82", name: "KR", flag: "🇰🇷" },
  { code: "+64", name: "NZ", flag: "🇳🇿" },
  { code: "+47", name: "NO", flag: "🇳🇴" },
  { code: "+46", name: "SE", flag: "🇸🇪" },
  { code: "+41", name: "CH", flag: "🇨🇭" },
];

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

// Initial data that can be passed from parent (e.g., via postMessage from Lovable)
export interface InitialUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  email?: string;
}

// Intake question options
const GOAL_OPTIONS = ["Muscle Growth", "Anti-Aging", "Recovery", "Other"];
const STAGE_OPTIONS = ["Starting a Protocol", "Optimizing Existing Protocol", "Just Researching"];
const INTEREST_OPTIONS = ["Purchasing Peptides", "Coaching Services", "Personalized Advice"];

type Step = "contact" | "consent" | "intake";

interface MobileGatewayProps {
  repId?: string;
  onSubmit: (data: CustomerData) => Promise<void>;
  showInstagram?: boolean;
  initialData?: InitialUserData | null;
  autoSkipContact?: boolean;
}

export function MobileGateway({
  onSubmit,
  showInstagram = true,
  initialData,
  autoSkipContact = false,
}: MobileGatewayProps) {
  // Determine initial step based on whether we have complete data and autoSkip is enabled
  const hasCompleteContactData = !!(
    initialData?.firstName &&
    initialData?.lastName &&
    initialData?.phone &&
    initialData?.dateOfBirth
  );

  const initialStep: Step = autoSkipContact && hasCompleteContactData ? "consent" : "contact";

  const [step, setStep] = useState<Step>(initialStep);
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState("US"); // Store country name as value for uniqueness
  const [instagramHandle, setInstagramHandle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dataInitialized, setDataInitialized] = useState(false);

  // Pre-fill form fields from initialData
  useEffect(() => {
    if (initialData && !dataInitialized) {
      if (initialData.firstName) setFirstName(initialData.firstName);
      if (initialData.lastName) setLastName(initialData.lastName);
      if (initialData.phone) {
        // Format the phone number for display
        setMobileNumber(formatPhoneNumber(initialData.phone));
      }
      if (initialData.dateOfBirth) setDateOfBirth(initialData.dateOfBirth);
      setDataInitialized(true);
    }
  }, [initialData, dataInitialized]);

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
    return digits.length >= 7 && digits.length <= 15;
  };

  // Get the actual country code from the selected country name
  const getSelectedCountryCode = (): string => {
    const country = COUNTRY_CODES.find((c) => c.name === countryCode);
    return country?.code || "+1";
  };

  const validateContactForm = (): string | null => {
    if (!firstName.trim()) return "Please enter your first name";
    if (!lastName.trim()) return "Please enter your last name";
    if (!dateOfBirth) return "Please enter your date of birth";
    if (!validatePhone(mobileNumber)) return "Please enter a valid phone number (7-15 digits)";
    if (!consentGiven) return "Please agree to the terms to continue";
    return null;
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateContactForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep("intake");
  };

  const handleConsentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentGiven) {
      setError("Please agree to the terms to continue");
      return;
    }

    setError("");
    setStep("intake");
  };

  const validateIntakeForm = (): string | null => {
    if (selectedGoals.length === 0) return "Please select at least one goal";
    if (!selectedStage) return "Please select where you are in your journey";
    if (selectedInterests.length === 0) return "Please select at least one interest";
    return null;
  };

  const handleFinalSubmit = async () => {
    const validationError = validateIntakeForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const e164Number = getSelectedCountryCode() + mobileNumber.replace(/\D/g, "");

      const intakeAnswers: IntakeAnswers = {
        goals: selectedGoals,
        stage: selectedStage,
        interest: selectedInterests,
      };

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

  // Step 1: Contact Information
  if (step === "contact") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
        <Card className="w-full max-w-md p-6 space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Start a Conversation</h1>
            <p className="text-muted-foreground text-sm">
              Please provide your details to connect with our team
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-4">
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

            {/* Phone Number with Country Code */}
            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-sm flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Mobile Number
              </Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue>
                      {COUNTRY_CODES.find((c) => c.name === countryCode)?.flag}{" "}
                      {COUNTRY_CODES.find((c) => c.name === countryCode)?.code}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((country) => (
                      <SelectItem key={country.name} value={country.name}>
                        {country.flag} {country.code} ({country.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Phone number"
                  value={mobileNumber}
                  onChange={handlePhoneChange}
                  className="flex-1"
                  required
                />
              </div>
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

            <Button type="submit" className="w-full" size="lg">
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Step 2: Consent (shown when auto-skipping contact step)
  if (step === "consent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
        <Card className="w-full max-w-md p-6 space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Welcome Back, {firstName}!</h1>
            <p className="text-muted-foreground text-sm">
              We found your account. Just confirm below to continue.
            </p>
          </div>

          <form onSubmit={handleConsentSubmit} className="space-y-4">
            {/* Show pre-filled data summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{firstName} {lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{getSelectedCountryCode()} {mobileNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth:</span>
                <span className="font-medium">{dateOfBirth}</span>
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="consent-auto"
                checked={consentGiven}
                onChange={(e) => { setConsentGiven(e.target.checked); setError(""); }}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                autoFocus
              />
              <label htmlFor="consent-auto" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to receive communications and understand my information will be used to assist with my inquiry.
              </label>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("contact")}
                className="flex-1"
              >
                Edit Info
              </Button>
              <Button type="submit" className="flex-1" size="lg">
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // Step 3: Intake Questions
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Quick Questions</h1>
          <p className="text-muted-foreground text-sm">
            Help us understand your needs better
          </p>
        </div>

        <div className="space-y-4">
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

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(hasCompleteContactData && autoSkipContact ? "consent" : "contact")}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleFinalSubmit}
            className="flex-1"
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
        </div>
      </Card>
    </div>
  );
}
