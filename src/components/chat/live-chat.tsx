"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AutoExpandingTextarea } from "@/components/ui/auto-expanding-textarea";
import { Button } from "@/components/ui/button";
import { Send, User, Bot, Loader2, UserCircle, AlertCircle, X } from "lucide-react";
import { subscribeToMessages, markMessagesAsDelivered, markMessagesAsRead, subscribeToConversation } from "@/lib/firebase";
import type { Message, ChatMode } from "@/types";
import { Timestamp } from "firebase/firestore";
import { MessageStatusIcon, type MessageStatus } from "./message-status-icon";
import { useMessageReadTracking } from "@/hooks/useMessageReadTracking";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface LiveChatProps {
  conversationId: string;
  chatMode: ChatMode;
  fallbackMode: boolean;
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

export function LiveChat({
  conversationId,
  chatMode,
  fallbackMode: initialFallback,
}: LiveChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(initialFallback);
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
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

  const handleEndChat = async () => {
    if (isEnding) return;

    const confirmed = window.confirm("Are you sure you want to end this chat? You can start a new conversation anytime.");
    if (!confirmed) return;

    setIsEnding(true);
    setError(null);

    try {
      const response = await fetch("/api/end-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to end chat");
      }

      setChatEnded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end chat");
    } finally {
      setIsEnding(false);
    }
  };

  const handleStartNewChat = () => {
    window.location.href = "/chat/new";
  };

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case "USER":
        return <User className="h-5 w-5 text-primary-foreground" />;
      case "ADMIN":
        return <UserCircle className="h-5 w-5 text-accent-foreground" />;
      case "AI":
        return <Bot className="h-5 w-5 text-accent-foreground" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    if (chatMode === "AI") {
      return isFallbackMode ? "AI Assistant (Text Mode)" : "AI Assistant";
    }
    return "Live Chat with Support";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <Card className="flex h-[100dvh] max-h-[700px] sm:h-[700px] w-full md:w-[600px] flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                {chatMode === "AI" ? (
                  <Bot className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <UserCircle className="h-6 w-6 text-primary-foreground" />
                )}
                {!chatEnded && (
                  <motion.div
                    className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                )}
              </motion.div>
              <div>
                <h1 className="text-lg font-semibold">{getTitle()}</h1>
                <p className="text-sm text-muted-foreground">
                  {chatEnded
                    ? "Chat ended"
                    : chatMode === "AI"
                    ? "Powered by AI"
                    : "Connected with our team"}
                </p>
              </div>
            </div>
            {!chatEnded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndChat}
                disabled={isEnding}
                className="text-muted-foreground hover:text-destructive"
              >
                {isEnding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span className="ml-1 text-xs">End</span>
              </Button>
            )}
          </div>
          {isFallbackMode && chatMode === "AI" && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Video unavailable - using text mode
            </div>
          )}
        </motion.div>

        {/* Messages */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto px-6"
          style={{ minHeight: 0 }}
        >
          <div
            className="space-y-6 py-6"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  ref={observeMessage}
                  data-message-id={message.id}
                  data-message-sender={message.sender}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className={`flex gap-3 ${
                    message.sender === "USER" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.1,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    }}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md ${
                      message.sender === "USER" ? "bg-primary" : "bg-accent"
                    }`}
                  >
                    {getSenderIcon(message.sender)}
                  </motion.div>
                  <div
                    className={`flex max-w-[85%] sm:max-w-[75%] flex-col ${
                      message.sender === "USER" ? "items-end" : "items-start"
                    }`}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className={`rounded-2xl px-4 py-3 shadow-sm ${
                        message.sender === "USER"
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      <p className="text-base sm:text-sm leading-relaxed">{message.content}</p>
                    </motion.div>
                    <div className="flex items-center gap-1 mt-1.5 px-1">
                      <time
                        className="text-sm sm:text-xs text-muted-foreground"
                        dateTime={message.timestamp.toISOString()}
                      >
                        {formatTime(message.timestamp)}
                      </time>
                      {/* Show edited indicator */}
                      {message.edited && (
                        <span className="text-sm sm:text-xs text-muted-foreground italic">edited</span>
                      )}
                      {/* Show read receipts only for user's own messages */}
                      {message.sender === "USER" && (
                        <MessageStatusIcon
                          status={getMessageStatus(message)}
                          readAt={message.readAt}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator - for API response wait or other user typing */}
            <AnimatePresence>
              {(isTyping || typingUsers.some(id => id !== userId)) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent shadow-md">
                    {chatMode === "AI" ? (
                      <Bot className="h-5 w-5 text-accent-foreground" />
                    ) : (
                      <UserCircle className="h-5 w-5 text-accent-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl bg-accent px-4 py-3 shadow-sm">
                    <motion.div
                      className="h-2 w-2 rounded-full bg-accent-foreground/60"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="h-2 w-2 rounded-full bg-accent-foreground/60"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="h-2 w-2 rounded-full bg-accent-foreground/60"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-2 bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border-t bg-gradient-to-r from-background via-accent/5 to-background p-6"
        >
          {chatEnded ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                This conversation has ended. Thank you for chatting with us!
              </p>
              <Button
                onClick={handleStartNewChat}
                className="rounded-full px-6"
              >
                Start New Chat
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              <AutoExpandingTextarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-w-0 flex-1 rounded-2xl border-2 px-4 focus-visible:ring-2 focus-visible:ring-primary"
                disabled={isTyping}
              />
              <Button
                onClick={handleSend}
                size="icon"
                disabled={!inputValue.trim() || isTyping}
                className="h-11 w-11 rounded-full shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95 shrink-0"
              >
                {isTyping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </Card>
    </div>
  );
}
