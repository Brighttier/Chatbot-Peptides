"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";

interface ChatBubbleProps {
  isOpen: boolean;
  onClick: () => void;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  unreadCount?: number;
  pulseAnimation?: boolean;
}

export function ChatBubble({
  isOpen,
  onClick,
  position = "bottom-right",
  primaryColor = "#2563eb",
  unreadCount = 0,
  pulseAnimation = true,
}: ChatBubbleProps) {
  const [showPulse, setShowPulse] = useState(pulseAnimation);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Stop pulse animation after first interaction
  useEffect(() => {
    if (isOpen && !hasInteracted) {
      setHasInteracted(true);
      setShowPulse(false);
    }
  }, [isOpen, hasInteracted]);

  // Position classes with safe area support for iPhone
  const positionClasses =
    position === "bottom-right" ? "right-4 sm:right-6" : "left-4 sm:left-6";

  return (
    <>
      {/* "Talk to us" Banner - Only visible when chat is closed */}
      {!isOpen && (
        <div
          className="fixed flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 ease-in-out pointer-events-none z-[9998] animate-fade-in"
          style={{
            backgroundColor: primaryColor,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            right: position === "bottom-right" ? "calc(1.5rem + 64px)" : undefined,
            left: position === "bottom-left" ? "calc(1.5rem + 64px)" : undefined,
          }}
        >
          <span className="text-white font-medium text-sm sm:text-base whitespace-nowrap">
            Talk to us
          </span>
        </div>
      )}

      {/* Chat Bubble Button */}
      <button
        onClick={onClick}
        className={`
          fixed ${positionClasses}
          w-14 h-14 sm:w-16 sm:h-16
          rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          hover:scale-110 active:scale-95
          focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50
          z-[9999]
        `}
        style={{
          backgroundColor: primaryColor,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
      {/* Pulse animation ring */}
      {showPulse && !isOpen && (
        <>
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-75"
            style={{ backgroundColor: primaryColor }}
          />
          <span
            className="absolute -inset-1 rounded-full animate-pulse opacity-40"
            style={{ backgroundColor: primaryColor }}
          />
        </>
      )}

      {/* Icon */}
      <div
        className={`
          transform transition-transform duration-300
          ${isOpen ? "rotate-90 scale-90" : "rotate-0 scale-100"}
        `}
      >
        {isOpen ? (
          <X className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        )}
      </div>

      {/* Unread badge */}
      {!isOpen && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      {/* Tooltip on hover (only when closed) */}
      {!isOpen && (
        <span className="absolute bottom-full mb-2 right-0 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Chat with us
          <span className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
        </span>
      )}
      </button>
    </>
  );
}
