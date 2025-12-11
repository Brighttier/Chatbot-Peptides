"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, UserCircle, Bot, Loader2, MessageSquare, Archive, ArchiveRestore, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Zap, X, Search, Trash2 } from "lucide-react";
import { subscribeToMessages } from "@/lib/firebase";
import type { Message, Conversation } from "@/types";
import { Timestamp } from "firebase/firestore";

interface ChatViewProps {
  conversation: Conversation | null;
  showLeftPanel?: boolean;
  showRightPanel?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  onConversationUpdate?: () => void;
}

interface DisplayMessage {
  id: string;
  content: string;
  sender: "USER" | "ADMIN" | "AI";
  timestamp: Date;
}

// Canned responses data
interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
}


export function ChatView({
  conversation,
  showLeftPanel = true,
  showRightPanel = true,
  onToggleLeftPanel,
  onToggleRightPanel,
  onConversationUpdate,
}: ChatViewProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [cannedSearchQuery, setCannedSearchQuery] = useState("");
  const [selectedCannedIndex, setSelectedCannedIndex] = useState(0);
  const [openedViaButton, setOpenedViaButton] = useState(false);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cannedMenuRef = useRef<HTMLDivElement>(null);

  // Fetch canned responses from API
  useEffect(() => {
    const fetchCannedResponses = async () => {
      try {
        const response = await fetch("/api/admin/canned-responses");
        if (response.ok) {
          const data = await response.json();
          if (data.responses && data.responses.length > 0) {
            setCannedResponses(data.responses.map((r: CannedResponse) => ({
              id: r.id,
              shortcut: r.shortcut,
              title: r.title,
              content: r.content,
              category: r.category || "General",
            })));
          }
        }
      } catch (err) {
        console.error("Failed to fetch canned responses:", err);
        // Keep using default responses
      }
    };
    fetchCannedResponses();
  }, []);

  // Filter canned responses based on search or shortcut typing
  const filteredCannedResponses = cannedResponses.filter((response) => {
    const query = cannedSearchQuery.toLowerCase();
    return (
      response.title.toLowerCase().includes(query) ||
      response.shortcut.toLowerCase().includes(query) ||
      response.content.toLowerCase().includes(query) ||
      response.category.toLowerCase().includes(query)
    );
  });

  // Group canned responses by category
  const groupedResponses = filteredCannedResponses.reduce((acc, response) => {
    if (!acc[response.category]) {
      acc[response.category] = [];
    }
    acc[response.category].push(response);
    return acc;
  }, {} as Record<string, CannedResponse[]>);

  // Handle selecting a canned response
  const handleSelectCannedResponse = useCallback((response: CannedResponse) => {
    setInputValue(response.content);
    setShowCannedResponses(false);
    setCannedSearchQuery("");
    setSelectedCannedIndex(0);
    setOpenedViaButton(false);
    inputRef.current?.focus();
  }, []);

  // Handle closing canned responses popup
  const handleCloseCannedResponses = useCallback(() => {
    setShowCannedResponses(false);
    setCannedSearchQuery("");
    setSelectedCannedIndex(0);
    setOpenedViaButton(false);
    // Clear input if it only contains "/" or a partial shortcut
    if (inputValue.startsWith("/")) {
      setInputValue("");
    }
    inputRef.current?.focus();
  }, [inputValue]);

  // Handle toggling canned responses via button
  const handleToggleCannedResponses = useCallback(() => {
    if (showCannedResponses) {
      // Close popup
      setShowCannedResponses(false);
      setCannedSearchQuery("");
      setSelectedCannedIndex(0);
      setOpenedViaButton(false);
    } else {
      // Open popup via button
      setShowCannedResponses(true);
      setCannedSearchQuery("");
      setSelectedCannedIndex(0);
      setOpenedViaButton(true);
    }
  }, [showCannedResponses]);

  // Check for "/" shortcut typing - show popup and handle exact match
  useEffect(() => {
    if (inputValue.startsWith("/")) {
      // Show canned responses popup when typing /
      setShowCannedResponses(true);
      setOpenedViaButton(false); // Mark as opened via typing

      // Sync the search query with what's typed after "/"
      const searchText = inputValue.slice(1); // Remove the "/"
      setCannedSearchQuery(searchText);
      setSelectedCannedIndex(0);

      // If exact shortcut match found, replace with content
      if (inputValue.length > 1) {
        const shortcutQuery = inputValue.toLowerCase();
        const matchingResponse = cannedResponses.find(
          (r) => r.shortcut.toLowerCase() === shortcutQuery
        );
        if (matchingResponse) {
          setInputValue(matchingResponse.content);
          setShowCannedResponses(false);
          setCannedSearchQuery("");
        }
      }
    } else if (showCannedResponses && !inputValue.startsWith("/") && !openedViaButton) {
      // Close popup only if opened via typing and user clears the /
      setShowCannedResponses(false);
      setCannedSearchQuery("");
    }
  }, [inputValue, showCannedResponses, openedViaButton, cannedResponses]);

  // Close canned responses menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cannedMenuRef.current &&
        !cannedMenuRef.current.contains(event.target as Node)
      ) {
        setShowCannedResponses(false);
        setOpenedViaButton(false);
      }
    };

    if (showCannedResponses) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCannedResponses]);

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

  const handleArchive = async () => {
    if (!conversation?.id) return;

    setIsArchiving(true);
    const shouldArchive = conversation.status !== "archived";

    try {
      const response = await fetch("/api/admin/archive-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          archive: shouldArchive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to archive conversation");
      }

      // Notify parent to refresh conversations
      onConversationUpdate?.();
    } catch (err) {
      console.error("Error archiving conversation:", err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!conversation?.id) return;

    if (!confirm(`Are you sure you want to delete this conversation with ${conversation.userMobileNumber}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/admin/delete-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Notify parent to refresh conversations
      onConversationUpdate?.();
    } catch (err) {
      console.error("Error deleting conversation:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle canned responses navigation
    if (showCannedResponses && filteredCannedResponses.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCannedIndex((prev) =>
          prev < filteredCannedResponses.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCannedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCannedResponses.length - 1
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelectCannedResponse(filteredCannedResponses[selectedCannedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseCannedResponses();
        return;
      }
    }

    // Normal Enter to send
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
      {/* Header with toggle buttons */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left toggle button */}
          {onToggleLeftPanel && (
            <button
              onClick={onToggleLeftPanel}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={showLeftPanel ? "Hide conversations" : "Show conversations"}
            >
              {showLeftPanel ? (
                <PanelLeftClose className="h-5 w-5 text-gray-500" />
              ) : (
                <PanelLeftOpen className="h-5 w-5 text-gray-500" />
              )}
            </button>
          )}

          {/* Center - User info */}
          <div className="flex items-center gap-3 flex-1 justify-center">
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

          {/* Right buttons - Archive and toggle */}
          <div className="flex items-center gap-2">
            {/* Archive button */}
            <button
              onClick={handleArchive}
              disabled={isArchiving}
              className={`p-2 rounded-lg transition-colors ${
                conversation.status === "archived"
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-600"
                  : "hover:bg-gray-100 text-gray-500"
              }`}
              title={conversation.status === "archived" ? "Unarchive conversation" : "Archive conversation"}
            >
              {isArchiving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : conversation.status === "archived" ? (
                <ArchiveRestore className="h-5 w-5" />
              ) : (
                <Archive className="h-5 w-5" />
              )}
            </button>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              title="Delete conversation"
            >
              {isDeleting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </button>

            {/* Right toggle button */}
            {onToggleRightPanel && (
              <button
                onClick={onToggleRightPanel}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={showRightPanel ? "Hide customer details" : "Show customer details"}
              >
                {showRightPanel ? (
                  <PanelRightClose className="h-5 w-5 text-gray-500" />
                ) : (
                  <PanelRightOpen className="h-5 w-5 text-gray-500" />
                )}
              </button>
            )}
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
      <div className="border-t bg-gray-50 p-4 relative">
        {/* Canned Responses Panel */}
        {showCannedResponses && (
          <div
            ref={cannedMenuRef}
            className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-hidden flex flex-col z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm text-gray-700">Canned Responses</span>
              </div>
              <button
                onClick={handleCloseCannedResponses}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Search hint - shows what user is typing */}
            {cannedSearchQuery && (
              <div className="px-4 py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span>Filtering by: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600">/{cannedSearchQuery}</code></span>
                </div>
              </div>
            )}

            {/* Responses list */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredCannedResponses.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">No responses found</p>
              ) : (
                <div className="space-y-1">
                  {filteredCannedResponses.map((response, index) => (
                    <button
                      key={response.id}
                      onClick={() => handleSelectCannedResponse(response)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        index === selectedCannedIndex
                          ? "bg-blue-100 border border-blue-300"
                          : "hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium text-sm ${
                          index === selectedCannedIndex ? "text-blue-700" : "text-gray-800"
                        }`}>
                          {response.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{response.category}</span>
                          <span className="text-xs text-blue-500 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                            {response.shortcut}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {response.content}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
              Keep typing (e.g. <code className="bg-gray-200 px-1 rounded">/hi</code>) or use <kbd className="bg-gray-200 px-1 rounded">↑↓</kbd> + <kbd className="bg-gray-200 px-1 rounded">Enter</kbd> to select
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Canned Responses Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleToggleCannedResponses}
            disabled={conversation.status !== "active"}
            className={`h-10 w-10 rounded-full shrink-0 ${
              showCannedResponses ? "bg-amber-50 border-amber-300 text-amber-600" : ""
            }`}
            title="Canned Responses (type / for shortcuts)"
          >
            <Zap className="h-4 w-4" />
          </Button>

          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or / for quick responses..."
            className="flex-1 rounded-full border-gray-200 bg-white px-4"
            disabled={isSending || conversation.status !== "active"}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={!inputValue.trim() || isSending || conversation.status !== "active"}
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {conversation.status === "archived" && (
          <p className="mt-2 text-center text-xs text-amber-600">
            This conversation is archived
          </p>
        )}
        {conversation.status !== "active" && conversation.status !== "archived" && (
          <p className="mt-2 text-center text-xs text-gray-400">
            This conversation has ended
          </p>
        )}
      </div>
    </div>
  );
}
