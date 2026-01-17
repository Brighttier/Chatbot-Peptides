"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Camera, Scissors, Trash2, Loader2, Bug, Sparkles, HelpCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureFullScreen, AreaSelector } from "./screenshot-capture";
import type { FeedbackType } from "@/types";

interface FeedbackModalProps {
  onClose: () => void;
  embedded?: boolean; // For popup window mode (no overlay backdrop)
  initialScreenshot?: string | null; // Pre-captured screenshot from parent website
  onRetakeScreenshot?: () => Promise<string | null>; // Handler to request new screenshot from parent
  onSelectArea?: () => Promise<string | null>; // Handler to request area selection from parent
}

export function FeedbackModal({
  onClose,
  embedded = false,
  initialScreenshot = null,
  onRetakeScreenshot,
  onSelectArea,
}: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(initialScreenshot);
  const [isCapturingArea, setIsCapturingArea] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update screenshot when initialScreenshot changes (e.g., on page load)
  useEffect(() => {
    if (initialScreenshot) {
      setScreenshot(initialScreenshot);
    }
  }, [initialScreenshot]);

  const handleCaptureFullScreen = useCallback(async () => {
    setIsCapturing(true);
    setError(null);
    try {
      // In embedded mode (popup), request screenshot from parent website
      if (embedded && onRetakeScreenshot) {
        const dataUrl = await onRetakeScreenshot();
        if (dataUrl) {
          setScreenshot(dataUrl);
        } else {
          setError("Could not capture screenshot from parent window.");
        }
      } else {
        // Regular mode - capture this window
        // Brief delay to allow modal to hide
        await new Promise((resolve) => setTimeout(resolve, 100));
        const dataUrl = await captureFullScreen();
        setScreenshot(dataUrl);
      }
    } catch (err) {
      console.error("Failed to capture screenshot:", err);
      setError("Failed to capture screenshot. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }, [embedded, onRetakeScreenshot]);

  const handleAreaCapture = useCallback((dataUrl: string) => {
    setScreenshot(dataUrl);
    setIsCapturingArea(false);
  }, []);

  // Handler for area selection from parent (embedded mode)
  const handleSelectAreaFromParent = useCallback(async () => {
    if (!onSelectArea) return;

    setIsCapturing(true);
    setError(null);
    try {
      const dataUrl = await onSelectArea();
      if (dataUrl) {
        setScreenshot(dataUrl);
      } else {
        setError("Area selection was cancelled or failed.");
      }
    } catch (err) {
      console.error("Failed to capture area:", err);
      setError("Failed to capture area. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }, [onSelectArea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }
    if (!reporterName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!reporterEmail.trim() || !reporterEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          reporterName: reporterName.trim(),
          reporterEmail: reporterEmail.trim().toLowerCase(),
          screenshot, // Base64 string or null
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      setSubmitSuccess(true);

      // Close modal after brief success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show area selector overlay
  if (isCapturingArea) {
    return (
      <AreaSelector
        onCapture={handleAreaCapture}
        onCancel={() => setIsCapturingArea(false)}
      />
    );
  }

  // Success state
  if (submitSuccess) {
    const successContent = (
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600">
          Your feedback has been submitted successfully. We&apos;ll review it and get back to you soon.
        </p>
      </div>
    );

    if (embedded) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" data-feedback-ui="true">
          {successContent}
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
        data-feedback-ui="true"
      >
        {successContent}
      </div>
    );
  }

  // Modal content (shared between embedded and overlay modes)
  const modalContent = (
    <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg ${embedded ? "" : "max-h-[90vh]"} overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Submit Feedback</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Type selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Type</Label>
            <div className="flex gap-2">
              {[
                { value: "bug" as const, label: "Bug Report", icon: Bug, color: "red" },
                { value: "feature" as const, label: "Feature Request", icon: Sparkles, color: "purple" },
                { value: "other" as const, label: "Other", icon: HelpCircle, color: "gray" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    type === option.value
                      ? option.color === "red"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : option.color === "purple"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-500 bg-gray-50 text-gray-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue or request"
              maxLength={100}
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about what happened or what you'd like to see..."
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Screenshot */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Screenshot (optional)</Label>
            {screenshot ? (
              <div className="relative">
                <img
                  src={screenshot}
                  alt="Captured screenshot"
                  className="w-full rounded-lg border border-gray-200 max-h-48 object-contain bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setScreenshot(null)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCaptureFullScreen}
                  disabled={isCapturing}
                  className="flex-1"
                >
                  {isCapturing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  {embedded && onRetakeScreenshot ? "Capture Website" : "Full Screen"}
                </Button>
                {/* Show area select: in embedded mode use parent handler, otherwise local */}
                {embedded && onSelectArea ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSelectAreaFromParent}
                    disabled={isCapturing}
                    className="flex-1"
                  >
                    {isCapturing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Scissors className="h-4 w-4 mr-2" />
                    )}
                    Select Area
                  </Button>
                ) : !embedded && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCapturingArea(true)}
                    className="flex-1"
                  >
                    <Scissors className="h-4 w-4 mr-2" />
                    Select Area
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Reporter info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Your Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="John Doe"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Your Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </div>
  );

  // Return embedded mode (for popup window - no overlay)
  if (embedded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50" data-feedback-ui="true">
        {modalContent}
      </div>
    );
  }

  // Return overlay mode (for in-page modal)
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      data-feedback-ui="true"
    >
      {modalContent}
    </div>
  );
}
