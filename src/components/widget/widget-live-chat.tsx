"use client";

import { useState, useRef, useEffect } from "react";
import { AutoExpandingTextarea } from "@/components/ui/auto-expanding-textarea";
import { Button } from "@/components/ui/button";
import { Send, User, Bot, Loader2, UserCircle, PhoneForwarded } from "lucide-react";
import { subscribeToMessages, markMessagesAsDelivered, markMessagesAsRead, subscribeToConversation } from "@/lib/firebase";
import type { Message, ChatMode } from "@/types";
import { Timestamp } from "firebase/firestore";
import { MessageStatusIcon, type MessageStatus } from "../chat/message-status-icon";
import { useMessageReadTracking } from "@/hooks/useMessageReadTracking";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface WidgetLiveChatProps {
  conversationId: string;
  chatMode: ChatMode;
  fallbackMode: boolean;
  onTransferToHuman?: () => void;
}

interface DisplayMessage {
  id: string;
  content: string;
  sender: "USER" | "ADMIN" | "AI";
  timestamp: Date;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  deliveredBy?: string[];
  readBy?: string[];
  edited?: boolean;
  editedAt?: Date | null;
}

export function WidgetLiveChat({
  conversationId,
  chatMode,
  fallbackMode: initialFallback,
  onTransferToHuman,
}: WidgetLiveChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(initialFallback);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize hooks for typing indicators and viewport-based read tracking
  const userId = "USER";
  const { handleTyping, clearTypingStatus } = useTypingIndicator(conversationId, userId);
  const { observeMessage } = useMessageReadTracking(conversationId, userId, messages);

  // Subscribe to real-time message updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (newMessages) => {
      // Convert Firestore messages to display format inline to avoid dependency issues
      const displayMessages: DisplayMessage[] = newMessages.map((m) => ({
        id: m.id!,
        content: m.content,
        sender: m.sender,
        timestamp:
          m.timestamp instanceof Timestamp
            ? m.timestamp.toDate()
            : new Date(m.timestamp as unknown as number),
        deliveredAt: m.deliveredAt instanceof Timestamp ? m.deliveredAt.toDate() : null,
        readAt: m.readAt instanceof Timestamp ? m.readAt.toDate() : null,
        deliveredBy: m.deliveredBy || [],
        readBy: m.readBy || [],
        edited: m.edited || false,
        editedAt: m.editedAt instanceof Timestamp ? m.editedAt.toDate() : null,
      }));
      setMessages(displayMessages);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Subscribe to conversation for typing indicators
  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversationId, (conversation) => {
      setTypingUsers(conversation.typingUsers || []);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Mark messages as delivered when chat opens
  useEffect(() => {
    markMessagesAsDelivered(conversationId, "USER");
  }, [conversationId]);

  // Mark messages as read when window has focus
  useEffect(() => {
    const handleFocus = () => {
      markMessagesAsRead(conversationId, "USER");
    };

    // Mark as read immediately
    handleFocus();

    // Listen for focus events
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Get message status for read receipts
  const getMessageStatus = (message: DisplayMessage): MessageStatus => {
    // Determine recipient ID based on sender
    const recipientId = message.sender === "USER" ? "ADMIN" : "USER";

    if (message.readBy?.includes(recipientId)) {
      return "read";
    }
    if (message.deliveredBy?.includes(recipientId)) {
      return "delivered";
    }
    return "sent";
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setInputValue("");
    setIsTyping(true);
    setError(null);

    // Clear typing indicator immediately when sending
    await clearTypingStatus();

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: trimmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      if (data.fallbackMode && !isFallbackMode) {
        setIsFallbackMode(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      console.error("Error sending message:", err);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case "USER":
        return <User className="h-4 w-4 text-white" />;
      case "ADMIN":
        return <UserCircle className="h-4 w-4 text-gray-600" />;
      case "AI":
        return <Bot className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{ minHeight: 0 }}
      >
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              <UserCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>Start the conversation!</p>
              <p className="text-xs mt-1">Your message will be sent to our team.</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              ref={observeMessage}
              data-message-id={message.id}
              data-message-sender={message.sender}
              className={`flex gap-2 ${
                message.sender === "USER" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  message.sender === "USER" ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                {getSenderIcon(message.sender)}
              </div>
              <div
                className={`flex max-w-[85%] sm:max-w-[75%] flex-col ${
                  message.sender === "USER" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-3 py-2 ${
                    message.sender === "USER"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-base sm:text-sm leading-relaxed">{message.content}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 px-1">
                  <time className="text-xs sm:text-[10px] text-gray-400">
                    {formatTime(message.timestamp)}
                  </time>
                  {message.edited && (
                    <span className="text-xs sm:text-[10px] text-gray-400 italic">edited</span>
                  )}
                  {/* Show read receipts only for user's own messages */}
                  {message.sender === "USER" && (
                    <MessageStatusIcon
                      status={getMessageStatus(message)}
                      readAt={message.readAt}
                      className="scale-75"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {(isTyping || typingUsers.some(id => id !== userId)) && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                {chatMode === "AI" ? (
                  <Bot className="h-4 w-4 text-gray-600" />
                ) : (
                  <UserCircle className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3 py-2">
                <div
                  className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-3 py-1.5 bg-red-50 text-red-600 text-xs text-center">
          {error}
        </div>
      )}

      {/* Transfer to Human Button (AI mode only) */}
      {chatMode === "AI" && onTransferToHuman && (
        <div className="px-3 py-2 border-t bg-gray-50">
          <button
            onClick={onTransferToHuman}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <PhoneForwarded className="h-4 w-4" />
            Talk to a Human Representative
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-white p-3">
        <div className="flex gap-2 items-end">
          <AutoExpandingTextarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-0 flex-1 text-sm rounded-2xl border-gray-200 px-4"
            maxHeight={120}
            disabled={isTyping}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={!inputValue.trim() || isTyping}
            className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
