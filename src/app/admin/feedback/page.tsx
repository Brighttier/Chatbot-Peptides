"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Bug,
  Sparkles,
  HelpCircle,
  ArrowLeft,
  Mail,
  Trash2,
  X,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeedbackType, FeedbackStatus } from "@/types";

interface FeedbackTicket {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  screenshotUrl?: string;
  status: FeedbackStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: { uid: string; name: string };
}

interface StatusCounts {
  all: number;
  open: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "text-yellow-700", bg: "bg-yellow-100" },
  pending: { label: "Pending", color: "text-orange-700", bg: "bg-orange-100" },
  in_progress: { label: "In Progress", color: "text-blue-700", bg: "bg-blue-100" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Cancelled", color: "text-gray-700", bg: "bg-gray-100" },
};

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-600" },
  feature: { label: "Feature", icon: Sparkles, color: "text-purple-600" },
  other: { label: "Other", icon: HelpCircle, color: "text-gray-600" },
};

export default function FeedbackTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    open: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    try {
      const url = filterStatus === "all"
        ? "/api/admin/feedback-tickets"
        : `/api/admin/feedback-tickets?status=${filterStatus}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        setStatusCounts(data.statusCounts);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: FeedbackStatus) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/feedback-tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
        fetchTickets(); // Refresh counts
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/feedback-tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });

      if (response.ok) {
        setSelectedTicket({ ...selectedTicket, adminNotes });
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, adminNotes } : t))
        );
      }
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/admin/feedback-tickets/${ticketId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(null);
        }
        setDeleteConfirm(null);
        fetchTickets(); // Refresh counts
      }
    } catch (error) {
      console.error("Failed to delete ticket:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Feedback Tickets</h1>
            <p className="text-sm text-gray-500">
              Manage bug reports and feature requests from users
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b px-6 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {(["all", "open", "pending", "in_progress", "completed", "cancelled"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status === "all"
                  ? "All"
                  : status === "in_progress"
                  ? "In Progress"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-1.5 opacity-75">
                  ({statusCounts[status]})
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-180px)]">
        {/* Ticket List */}
        <div className="w-full md:w-1/3 lg:w-1/4 border-r bg-white overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bug className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No tickets found</p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const TypeIcon = TYPE_CONFIG[ticket.type].icon;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setAdminNotes(ticket.adminNotes || "");
                    }}
                    className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                      selectedTicket?.id === ticket.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <TypeIcon
                        className={`h-5 w-5 mt-0.5 ${TYPE_CONFIG[ticket.type].color}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {ticket.title}
                          </span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {ticket.reporterName}
                        </p>
                        <span
                          className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_CONFIG[ticket.status].bg
                          } ${STATUS_CONFIG[ticket.status].color}`}
                        >
                          {STATUS_CONFIG[ticket.status].label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Ticket Details */}
        <div className="hidden md:flex flex-1 bg-white overflow-hidden">
          {selectedTicket ? (
            <div className="flex flex-col w-full">
              <ScrollArea className="flex-1 p-6">
                {/* Ticket Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const TypeIcon = TYPE_CONFIG[selectedTicket.type].icon;
                        return (
                          <TypeIcon
                            className={`h-5 w-5 ${TYPE_CONFIG[selectedTicket.type].color}`}
                          />
                        );
                      })()}
                      <span
                        className={`text-sm font-medium ${
                          TYPE_CONFIG[selectedTicket.type].color
                        }`}
                      >
                        {TYPE_CONFIG[selectedTicket.type].label}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedTicket.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Dropdown */}
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) =>
                        handleStatusChange(selectedTicket.id, value as FeedbackStatus)
                      }
                    >
                      <SelectTrigger className="w-36" disabled={isUpdating}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Delete Button */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteConfirm(selectedTicket.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Reporter Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedTicket.reporterName}</p>
                      <p className="text-sm text-gray-500">{selectedTicket.reporterEmail}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `mailto:${selectedTicket.reporterEmail}?subject=Re: ${encodeURIComponent(
                            selectedTicket.title
                          )}`,
                          "_blank"
                        )
                      }
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Submitted {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Screenshot */}
                {selectedTicket.screenshotUrl && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Screenshot</h3>
                    <div
                      className="relative cursor-pointer group"
                      onClick={() => setShowScreenshot(true)}
                    >
                      <img
                        src={selectedTicket.screenshotUrl}
                        alt="Feedback screenshot"
                        className="rounded-lg border max-h-64 object-contain bg-gray-50"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <ExternalLink className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Admin Notes</h3>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this ticket..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isUpdating || adminNotes === (selectedTicket.adminNotes || "")}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save Notes"
                      )}
                    </Button>
                  </div>
                </div>

                {/* Resolution Info */}
                {selectedTicket.resolvedAt && selectedTicket.resolvedBy && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-700">
                      Resolved by <span className="font-medium">{selectedTicket.resolvedBy.name}</span>
                      {" on "}
                      {new Date(selectedTicket.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Bug className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {showScreenshot && selectedTicket?.screenshotUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowScreenshot(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setShowScreenshot(false)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selectedTicket.screenshotUrl}
            alt="Feedback screenshot"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Ticket?</h3>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. The ticket and any associated screenshot will be
              permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
