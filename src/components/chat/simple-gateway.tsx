"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Instagram, Loader2, User } from "lucide-react";

interface SimpleCustomerData {
  name: string;
  instagramHandle: string;
}

interface SimpleGatewayProps {
  repId?: string;
  onSubmit: (data: SimpleCustomerData) => Promise<void>;
}

/**
 * Simplified gateway for direct link chat
 * Only collects Name + Instagram Handle
 */
export function SimpleGateway({
  onSubmit,
}: SimpleGatewayProps) {
  const [name, setName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = (): string | null => {
    if (!name.trim()) return "Please enter your name";
    if (!instagramHandle.trim()) return "Please enter your Instagram handle";
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
      // Clean up Instagram handle - ensure it starts with @
      let cleanHandle = instagramHandle.trim();
      if (!cleanHandle.startsWith("@")) {
        cleanHandle = "@" + cleanHandle;
      }

      await onSubmit({
        name: name.trim(),
        instagramHandle: cleanHandle,
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
        <div className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Start a Conversation</h1>
            <p className="text-muted-foreground text-sm">
              Enter your details to connect with us
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Your Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              required
              autoFocus
            />
          </div>

          {/* Instagram Handle */}
          <div className="space-y-1.5">
            <Label htmlFor="instagram" className="text-sm flex items-center gap-1.5">
              <Instagram className="h-3.5 w-3.5" />
              Instagram Handle
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
                setError("");
              }}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Start Chat"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
