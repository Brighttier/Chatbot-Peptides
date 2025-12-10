"use client";

import { useState, useEffect } from "react";
import { ConversationList } from "./conversation-list";
import { ChatView } from "./chat-view";
import { CustomerDetails } from "./customer-details";
import type { Conversation } from "@/types";
import { Loader2 } from "lucide-react";

interface ConversationWithPreview extends Conversation {
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: string;
  };
}

export function AdminDashboard() {
  const [conversations, setConversations] = useState<ConversationWithPreview[]>(
    []
  );
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch("/api/admin/conversations");
        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }
        const data = await response.json();
        setConversations(data.conversations);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        console.error("Error fetching conversations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();

    // Poll for new conversations every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = (conversation: ConversationWithPreview) => {
    setSelectedConversation(conversation);
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
    <div className="flex h-screen bg-gray-100">
      {/* Left Column - Conversation List */}
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id || null}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Middle Column - Chat View */}
      <div className="flex-1 min-w-0">
        <ChatView conversation={selectedConversation} />
      </div>

      {/* Right Column - Customer Details */}
      <div className="w-80 shrink-0">
        <CustomerDetails conversation={selectedConversation} />
      </div>
    </div>
  );
}
