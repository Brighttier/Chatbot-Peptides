"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, UserCircle, Bot, Loader2, MessageSquare } from "lucide-react";
import { subscribeToMessages } from "@/lib/firebase";
import type { Message, Conversation } from "@/types";
import { Timestamp } from "firebase/firestore";

interface ChatViewProps {
  conversation: Conversation | null;
}

interface DisplayMessage {
  id: string;
  content: string;
  sender: "USER" | "ADMIN" | "AI";
  timestamp: Date;
}

export function ChatView({ conversation }: ChatViewProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert Firestore messages to display format
  const convertMessages = useCallback(
    (firestoreMessages: Message[]): DisplayMessage[] => {
      return firestoreMessages.map((m) => ({
        id: m.id!,
        content: m.content,
        sender: m.sender,
        timestamp:
          m.timestamp instanceof Timestamp
            ? m.timestamp.toDate()
            : new Date(m.timestamp as unknown as number),
      }));
    },
    []
  );

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversation?.id) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(conversation.id, (newMessages) => {
      setMessages(convertMessages(newMessages));
    });

    return () => unsubscribe();
  }, [conversation?.id, convertMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !conversation?.id) return;

    setInputValue("");
    setIsSending(true);

    try {
      const response = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: trimmed,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case "USER":
        return <User className="h-4 w-4" />;
      case "ADMIN":
        return <UserCircle className="h-4 w-4" />;
      case "AI":
        return <Bot className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50 text-gray-400">
        <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Select a conversation</p>
        <p className="text-sm">Choose a chat from the list to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.userMobileNumber}
            </h3>
            <p className="text-sm text-gray-500">
              {conversation.chatMode === "AI" ? "AI Chat" : "Human Support"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ minHeight: 0 }}
      >
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === "USER" ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    message.sender === "USER"
                      ? "bg-gray-200 text-gray-600"
                      : message.sender === "ADMIN"
                      ? "bg-blue-500 text-white"
                      : "bg-purple-500 text-white"
                  }`}
                >
                  {getSenderIcon(message.sender)}
                </div>
                <div
                  className={`flex max-w-[70%] flex-col ${
                    message.sender === "USER" ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      message.sender === "USER"
                        ? "bg-gray-100 text-gray-900"
                        : message.sender === "ADMIN"
                        ? "bg-blue-500 text-white"
                        : "bg-purple-500 text-white"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <span className="mt-1 text-xs text-gray-400">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-gray-50 p-4">
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-full border-gray-200 bg-white px-4"
            disabled={isSending || conversation.status !== "active"}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={!inputValue.trim() || isSending || conversation.status !== "active"}
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {conversation.status !== "active" && (
          <p className="mt-2 text-center text-xs text-gray-400">
            This conversation has ended
          </p>
        )}
      </div>
    </div>
  );
}
