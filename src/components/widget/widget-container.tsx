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
  | "ai-avatar"
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
  compact: { width: 350, height: 480 },
  standard: { width: 380, height: 550 },
  large: { width: 420, height: 620 },
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
    // After accepting disclaimer, go to appropriate chat
    if (chatMode === "AI") {
      setStep("ai-avatar");
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

  const submitChat = useCallback(
    async (intakeAnswers?: IntakeAnswers) => {
      if (!pendingCustomerData) return;

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/init-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repId,
            userMobileNumber: pendingCustomerData.mobileNumber,
            userInstagramHandle: pendingCustomerData.instagramHandle,
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
    } else if (step === "ai-avatar") {
      setStep("mode-selection");
      setChatMode(null);
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

  const widgetWidth = Math.min(dimensions.width, windowSize.width - 32);
  const widgetHeight = Math.min(dimensions.height, windowSize.height - 120);

  // Get header title based on step
  const getHeaderTitle = () => {
    switch (step) {
      case "mode-selection":
        return "Chat with us";
      case "disclaimer":
        return "Important Notice";
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
            fixed bottom-20 sm:bottom-24 ${positionClasses}
            bg-white shadow-2xl overflow-hidden
            transition-all duration-300 ease-out
            z-[9998] flex flex-col
          `}
          style={{
            width: widgetWidth,
            height: widgetHeight,
            borderRadius: borderRadius,
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

            {step === "ai-avatar" && (
              <StreamingAvatar
                onClose={handleBackToModes}
                welcomeMessage={welcomeMessage}
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
