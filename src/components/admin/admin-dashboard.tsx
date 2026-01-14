"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConversationList } from "./conversation-list";
import { ChatView } from "./chat-view";
import { CustomerDetails } from "./customer-details";
import { NotificationBell } from "./notification-bell";
import type { Conversation, Message, MessageSender } from "@/types";
import { Loader2, ArrowLeft, Info, Send, User, UserCircle, Bot, MessageSquare, Phone, Instagram, MessageCircle, Clock, Hash, Settings, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { subscribeToMessages } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import Link from "next/link";
import Image from "next/image";

interface ConversationWithPreview extends Conversation {
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: MessageSender;
  };
  hasUnread?: boolean;
}

type MobileView = "list" | "chat" | "details";

// Min and max widths for resizable panels
const MIN_PANEL_WIDTH = 250;
const MAX_PANEL_WIDTH = 500;
const DEFAULT_PANEL_WIDTH = 320;

export function AdminDashboard() {
  const { user, logout, hasRole } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const [conversations, setConversations] = useState<ConversationWithPreview[]>(
    []
  );
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithPreview | null>(null);
  const selectedConversationRef = useRef<ConversationWithPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [showConversationList, setShowConversationList] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousUnreadCountRef = useRef<number>(0);

  // Check if user can access settings (all roles can access for canned responses)
  const canAccessSettings = hasRole(["super_admin", "admin", "rep"]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Resizable panel widths
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Handle left panel resize
  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  // Handle right panel resize
  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  // Global mouse move and up handlers for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, e.clientX));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingLeft, isResizingRight]);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Play notification sound when unread count increases
  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current && previousUnreadCountRef.current >= 0) {
      playNotificationSound();
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount, playNotificationSound]);

  // Fetch conversations function
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/conversations");
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      const data = await response.json();
      setConversations(data.conversations);
      setUnreadCount(data.unreadCount || 0);

      // Update or clear selected conversation using ref to avoid dependency
      const currentSelection = selectedConversationRef.current;
      if (currentSelection) {
        const updated = data.conversations.find(
          (c: ConversationWithPreview) => c.id === currentSelection.id
        );
        if (updated) {
          setSelectedConversation(updated);
        } else {
          // Conversation was deleted (e.g., during merge), clear selection
          setSelectedConversation(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      console.error("Error fetching conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();

    // Poll for new conversations every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const handleSelectConversation = async (conversation: ConversationWithPreview) => {
    setSelectedConversation(conversation);
    setMobileView("chat");

    // Mark conversation as read if it has unread messages
    if (conversation.hasUnread && conversation.id) {
      try {
        await fetch("/api/admin/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversation.id }),
        });
        // Update local state to reflect read status
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id ? { ...c, hasUnread: false } : c
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking conversation as read:", err);
      }
    }
  };

  // Handle clicking a conversation from the notification bell
  const handleNotificationClick = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      handleSelectConversation(conversation);
    }
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  const handleShowDetails = () => {
    setMobileView("details");
  };

  const handleBackToChat = () => {
    setMobileView("chat");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-500 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Layout - 3 columns with collapsible and resizable panels */}
      <div className="hidden lg:flex lg:flex-col h-screen bg-gray-100">
        {/* Top Header Bar */}
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="Jon Andersen"
              width={200}
              height={56}
              className="h-14 w-auto"
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell
              unreadCount={unreadCount}
              unreadConversations={conversations
                .filter((c) => c.hasUnread)
                .map((c) => ({
                  id: c.id!,
                  userMobileNumber: c.userMobileNumber,
                  lastMessage: c.lastMessage,
                  customerInfo: c.customerInfo,
                }))}
              onConversationClick={handleNotificationClick}
            />

            {/* User info */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="hidden xl:block">
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace("_", " ")}</p>
              </div>
            </div>

            {/* Settings button - only for admin/super_admin */}
            {canAccessSettings && (
              <Link
                href="/admin/settings"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
            )}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
              title="Logout"
            >
              {isLoggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 min-h-0">
        {/* Left Column - Conversation List (collapsible & resizable) */}
        <div
          className={`shrink-0 transition-all ease-in-out ${
            showConversationList ? "" : "w-0"
          } overflow-hidden relative`}
          style={{
            width: showConversationList ? leftPanelWidth : 0,
            transitionProperty: isResizingLeft ? "none" : "width",
            transitionDuration: isResizingLeft ? "0ms" : "300ms"
          }}
        >
          <div className="h-full" style={{ width: leftPanelWidth }}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
              onRefresh={fetchConversations}
            />
          </div>
        </div>

        {/* Left Resize Handle */}
        {showConversationList && (
          <div
            className="w-1 hover:w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-all shrink-0 relative group"
            onMouseDown={handleLeftMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-400/20" />
          </div>
        )}

        {/* Middle Column - Chat View with toggle buttons in header */}
        <div className="flex-1 min-w-0">
          <ChatView
            conversation={selectedConversation}
            showLeftPanel={showConversationList}
            showRightPanel={showCustomerDetails}
            onToggleLeftPanel={() => setShowConversationList(!showConversationList)}
            onToggleRightPanel={() => setShowCustomerDetails(!showCustomerDetails)}
            onConversationUpdate={fetchConversations}
          />
        </div>

        {/* Right Resize Handle */}
        {showCustomerDetails && (
          <div
            className="w-1 hover:w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-all shrink-0 relative group"
            onMouseDown={handleRightMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-400/20" />
          </div>
        )}

        {/* Right Column - Customer Details (collapsible & resizable) */}
        <div
          className={`shrink-0 transition-all ease-in-out ${
            showCustomerDetails ? "" : "w-0"
          } overflow-hidden relative`}
          style={{
            width: showCustomerDetails ? rightPanelWidth : 0,
            transitionProperty: isResizingRight ? "none" : "width",
            transitionDuration: isResizingRight ? "0ms" : "300ms"
          }}
        >
          <div className="h-full" style={{ width: rightPanelWidth }}>
            <CustomerDetails conversation={selectedConversation} />
          </div>
        </div>
        </div>
      </div>

      {/* Mobile Layout - Single panel with navigation */}
      <div className="lg:hidden h-screen bg-gray-100 flex flex-col">
        {/* Mobile: Conversation List */}
        {mobileView === "list" && (
          <div className="flex-1 flex flex-col">
            {/* Mobile Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between safe-area-inset">
              <div className="flex items-center">
                <Image
                  src="/logo.png"
                  alt="Jon Andersen"
                  width={160}
                  height={48}
                  className="h-12 w-auto"
                  priority
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Notification Bell - Mobile */}
                <NotificationBell
                  unreadCount={unreadCount}
                  unreadConversations={conversations
                    .filter((c) => c.hasUnread)
                    .map((c) => ({
                      id: c.id!,
                      userMobileNumber: c.userMobileNumber,
                      lastMessage: c.lastMessage,
                      customerInfo: c.customerInfo,
                    }))}
                  onConversationClick={handleNotificationClick}
                />
                {canAccessSettings && (
                  <Link
                    href="/admin/settings"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id || null}
                onSelect={handleSelectConversation}
                onRefresh={fetchConversations}
              />
            </div>
          </div>
        )}

        {/* Mobile: Chat View */}
        {mobileView === "chat" && (
          <div className="flex-1 flex flex-col">
            {/* Mobile Chat Header with back button */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between safe-area-inset">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600 -ml-2 px-2 py-1"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Chats</span>
              </button>

              <div className="flex-1 text-center">
                <p className="font-medium text-gray-900 text-sm truncate px-2">
                  {selectedConversation?.userMobileNumber || "Chat"}
                </p>
              </div>

              <button
                onClick={handleShowDetails}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600 px-2 py-1 -mr-2"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>

            {/* Chat content - modified to not show its own header */}
            <div className="flex-1 min-h-0">
              <ChatViewMobile conversation={selectedConversation} />
            </div>
          </div>
        )}

        {/* Mobile: Customer Details */}
        {mobileView === "details" && (
          <div className="flex-1 flex flex-col">
            {/* Mobile Details Header with back button */}
            <div className="bg-white border-b px-4 py-3 flex items-center safe-area-inset">
              <button
                onClick={handleBackToChat}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600 -ml-2 px-2 py-1"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Chat</span>
              </button>

              <div className="flex-1 text-center">
                <p className="font-medium text-gray-900">Customer Details</p>
              </div>

              <div className="w-16" /> {/* Spacer for centering */}
            </div>

            {/* Details content - modified to not show its own header */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CustomerDetailsMobile conversation={selectedConversation} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Mobile-optimized ChatView without header (header is handled by parent)
// Note: Uses imports from top of file

interface DisplayMessage {
  id: string;
  content: string;
  sender: "USER" | "ADMIN" | "AI";
  timestamp: Date;
}

function ChatViewMobile({ conversation }: { conversation: Conversation | null }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-4 py-4"
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
                className={`flex gap-2 ${
                  message.sender === "USER" ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
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
                  className={`flex max-w-[85%] sm:max-w-[75%] flex-col ${
                    message.sender === "USER" ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-3 py-2 ${
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

      {/* Input - sticky at bottom */}
      <div className="border-t bg-gray-50 p-3 safe-area-bottom">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-full border-gray-200 bg-white px-4 h-10"
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
        {conversation.status !== "active" && (
          <p className="mt-2 text-center text-xs text-gray-400">
            This conversation has ended
          </p>
        )}
      </div>
    </div>
  );
}

// Mobile-optimized CustomerDetails without header
function CustomerDetailsMobile({ conversation }: { conversation: Conversation | null }) {
  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50 text-gray-400 p-4">
        <User className="h-12 w-12 mb-2 opacity-30" />
        <p className="text-sm">No customer selected</p>
      </div>
    );
  }

  const formatDate = (timestamp: Timestamp | Date | unknown) => {
    let date: Date;

    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp && typeof timestamp === 'object' && '_seconds' in timestamp) {
      // Handle serialized Firestore Timestamp from API
      date = new Date((timestamp as { _seconds: number })._seconds * 1000);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return 'Unknown';
    }

    if (isNaN(date.getTime())) {
      return 'Unknown';
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white p-4">
      <div className="space-y-6">
        {/* Customer Avatar & Phone */}
        <div className="flex flex-col items-center pb-4 border-b">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <User className="h-8 w-8 text-blue-500" />
          </div>
          <h4 className="font-medium text-gray-900">
            {conversation.userMobileNumber}
          </h4>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              conversation.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {conversation.status}
          </span>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Contact Information
          </h5>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Phone className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conversation.userMobileNumber}
                </p>
              </div>
            </div>

            {conversation.userInstagramHandle && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Instagram className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Instagram</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    @{conversation.userInstagramHandle}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Details */}
        <div className="space-y-4">
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Conversation Details
          </h5>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <MessageCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Chat Mode</p>
                <p className="text-sm font-medium text-gray-900">
                  {conversation.chatMode === "AI" ? "AI Assistant" : "Human Support"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Started</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(conversation.createdAt)}
                </p>
              </div>
            </div>

            {conversation.twilioConversationSid && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Hash className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Twilio SID</p>
                  <p className="text-xs font-mono text-gray-600 break-all">
                    {conversation.twilioConversationSid}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rep Phone */}
        <div className="space-y-4">
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Assigned To
          </h5>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Rep Phone</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {conversation.repPhoneNumber}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
