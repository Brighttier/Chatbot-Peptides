"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatBubble } from "./chat-bubble";
import { WidgetModeSelection } from "./widget-mode-selection";
import { WidgetPhoneInput, CustomerData, IntakeAnswers } from "./widget-phone-input";
import { WidgetIntakeQuestions } from "./widget-intake-questions";
import { WidgetLiveChat } from "./widget-live-chat";
import { MedicalDisclaimer } from "@/components/chat/medical-disclaimer";
import { StreamingAvatar } from "@/components/chat/streaming-avatar";
import { X, ArrowLeft } from "lucide-react";

type WidgetStep =
  | "collapsed"
  | "mode-selection"
  | "disclaimer"
  | "ai-phone"
  | "ai-avatar"
  | "transfer-intake"
  | "human-phone"
  | "human-intake"
  | "human-chat";

type ChatMode = "AI" | "HUMAN";

interface WidgetContainerProps {
  repId: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  size?: "compact" | "standard" | "large";
  borderRadius?: number;
  welcomeMessage?: string;
  autoExpand?: boolean;
  expandDelay?: number;
}

const sizeMap = {
  compact: { width: 320, height: 450 },
  standard: { width: 360, height: 520 },
  large: { width: 400, height: 600 },
};

export function WidgetContainer({
  repId,
  position = "bottom-right",
  primaryColor = "#2563eb",
  size = "standard",
  borderRadius = 16,
  welcomeMessage = "Hi! How can I help you today?",
  autoExpand = false,
  expandDelay = 3000,
}: WidgetContainerProps) {
  const [step, setStep] = useState<WidgetStep>("collapsed");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 400, height: 600 });
  const [pendingCustomerData, setPendingCustomerData] = useState<CustomerData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = step !== "collapsed";
  const dimensions = sizeMap[size];

  // Track window size for responsive sizing
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Auto-expand after delay
  useEffect(() => {
    if (autoExpand && step === "collapsed") {
      const timer = setTimeout(() => {
        setStep("mode-selection");
      }, expandDelay);
      return () => clearTimeout(timer);
    }
  }, [autoExpand, expandDelay, step]);

  // Notify parent window of state changes (for embedded widget)
  useEffect(() => {
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage(
        { type: "peptide-chat-state", isOpen },
        "*"
      );
    }
  }, [isOpen]);

  const handleBubbleClick = () => {
    if (isOpen) {
      setStep("collapsed");
    } else {
      // Start with mode selection
      setStep("mode-selection");
    }
  };

  const handleModeSelect = (mode: ChatMode) => {
    setChatMode(mode);
    // Go to disclaimer after selecting mode
    setStep("disclaimer");
  };

  const handleDisclaimerAccept = () => {
    // After accepting disclaimer, go to phone input for both modes
    if (chatMode === "AI") {
      setStep("ai-phone");
    } else {
      setStep("human-phone");
    }
  };

  const handlePhoneSubmit = useCallback(
    async (data: CustomerData) => {
      // Store customer data and go to intake questions
      setPendingCustomerData(data);
      setStep("human-intake");
    },
    []
  );

  // AI phone submit - create AI conversation and go directly to avatar
  const handleAIPhoneSubmit = useCallback(
    async (data: CustomerData) => {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/init-ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repId,
            userMobileNumber: data.mobileNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            consentGiven: data.consentGiven,
            // No intake answers yet - will be collected on transfer to human
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Failed to start AI chat");
        }

        setConversationId(responseData.conversationId);
        setStep("ai-avatar");
      } catch (error) {
        console.error("Failed to init AI chat:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [repId]
  );

  // Handle transfer from AI to Human - show intake form
  const handleTransferToHuman = useCallback(() => {
    setStep("transfer-intake");
  }, []);

  // Handle transfer intake submission - update conversation and switch to human chat
  const handleTransferIntakeSubmit = useCallback(
    async (answers: IntakeAnswers) => {
      if (!conversationId) return;

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/transfer-to-human", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            intakeAnswers: answers,
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Failed to transfer to human");
        }

        setStep("human-chat");
      } catch (error) {
        console.error("Failed to transfer to human:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId]
  );

  const submitChat = useCallback(
    async (intakeAnswers?: IntakeAnswers) => {
      if (!pendingCustomerData) return;

      setIsSubmitting(true);
      try {
        // Use widget-specific API endpoint (doesn't require Instagram)
        const response = await fetch("/api/widget/init-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repId,
            userMobileNumber: pendingCustomerData.mobileNumber,
            firstName: pendingCustomerData.firstName,
            lastName: pendingCustomerData.lastName,
            dateOfBirth: pendingCustomerData.dateOfBirth,
            consentGiven: pendingCustomerData.consentGiven,
            intakeAnswers,
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Failed to start chat");
        }

        setConversationId(responseData.conversationId);
        setStep("human-chat");
        setPendingCustomerData(null);
      } catch (error) {
        console.error("Failed to init chat:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [repId, pendingCustomerData]
  );

  const handleIntakeSubmit = useCallback(
    (answers: IntakeAnswers) => {
      submitChat(answers);
    },
    [submitChat]
  );

  const handleClose = () => {
    setStep("collapsed");
  };

  const handleBack = () => {
    if (step === "disclaimer") {
      setStep("mode-selection");
      setChatMode(null);
    } else if (step === "human-phone") {
      setStep("disclaimer");
    } else if (step === "human-intake") {
      setStep("human-phone");
      setPendingCustomerData(null);
    } else if (step === "ai-phone") {
      setStep("disclaimer");
    } else if (step === "ai-avatar") {
      setStep("ai-phone");
    } else if (step === "transfer-intake") {
      setStep("ai-avatar");
    } else if (step === "human-chat") {
      setStep("mode-selection");
      setChatMode(null);
      setConversationId(null);
    }
  };

  const handleBackToModes = () => {
    setStep("mode-selection");
    setChatMode(null);
    setConversationId(null);
  };

  // Position classes for the expanded widget
  const positionClasses =
    position === "bottom-right" ? "right-4 sm:right-6" : "left-4 sm:left-6";

  // Responsive widget sizing with safe area consideration
  const widgetWidth = Math.min(dimensions.width, windowSize.width - 16);
  const widgetHeight = Math.min(dimensions.height, windowSize.height - 100);

  // Get header title based on step
  const getHeaderTitle = () => {
    switch (step) {
      case "mode-selection":
        return "Chat with us";
      case "disclaimer":
        return "Important Notice";
      case "ai-phone":
        return "Connect with us";
      case "transfer-intake":
        return "Talk to Human";
      case "human-phone":
        return "Connect with us";
      case "human-intake":
        return "Quick Questions";
      case "human-chat":
        return "Live Chat";
      default:
        return "Chat";
    }
  };

  return (
    <>
      {/* Chat Bubble */}
      <ChatBubble
        isOpen={isOpen}
        onClick={handleBubbleClick}
        position={position}
        primaryColor={primaryColor}
        pulseAnimation={!isOpen}
      />

      {/* Expanded Widget */}
      {isOpen && (
        <div
          className={`
            fixed ${positionClasses}
            bg-white shadow-2xl overflow-hidden
            transition-all duration-300 ease-out
            z-[9998] flex flex-col
          `}
          style={{
            width: widgetWidth,
            height: widgetHeight,
            borderRadius: borderRadius,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          }}
        >
          {/* Header - shown on all steps except ai-avatar */}
          {step !== "ai-avatar" && (
            <div
              className="flex items-center justify-between px-4 py-3 text-white shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2">
                {step !== "mode-selection" && (
                  <button
                    onClick={handleBack}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="font-semibold text-sm">{getHeaderTitle()}</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Content Area - takes remaining space */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {step === "mode-selection" && (
              <WidgetModeSelection onSelectMode={handleModeSelect} />
            )}

            {step === "disclaimer" && (
              <MedicalDisclaimer onAccept={handleDisclaimerAccept} />
            )}

            {step === "ai-phone" && (
              <WidgetPhoneInput
                onSubmit={handleAIPhoneSubmit}
                showInstagram={false}
              />
            )}

            {step === "ai-avatar" && conversationId && (
              <StreamingAvatar
                conversationId={conversationId}
                onClose={handleBackToModes}
                onTransferToHuman={handleTransferToHuman}
                welcomeMessage={welcomeMessage}
              />
            )}

            {step === "transfer-intake" && (
              <WidgetIntakeQuestions
                onSubmit={handleTransferIntakeSubmit}
                isLoading={isSubmitting}
                transferMessage="We're connecting you to a human agent. Please answer a few quick questions while you wait."
              />
            )}

            {step === "human-phone" && (
              <WidgetPhoneInput
                onSubmit={handlePhoneSubmit}
                showInstagram={false}
              />
            )}

            {step === "human-intake" && (
              <WidgetIntakeQuestions
                onSubmit={handleIntakeSubmit}
                isLoading={isSubmitting}
              />
            )}

            {step === "human-chat" && conversationId && (
              <WidgetLiveChat
                conversationId={conversationId}
                chatMode="HUMAN"
                fallbackMode={false}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
