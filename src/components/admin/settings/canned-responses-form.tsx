"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  MessageSquareText,
  Command,
  CheckCircle,
  Sparkles,
} from "lucide-react";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut: string;
  category?: string;
}

const categories = [
  { value: "", label: "No Category" },
  { value: "General", label: "General" },
  { value: "Sales", label: "Sales" },
  { value: "Support", label: "Support" },
];

// Default canned responses to seed the database
const DEFAULT_RESPONSES = [
  {
    shortcut: "/hi",
    title: "Greeting",
    content: "Hi there! Thanks for reaching out. How can I help you today?",
    category: "General",
  },
  {
    shortcut: "/thanks",
    title: "Thank You",
    content: "Thank you for your message! I'll look into this and get back to you shortly.",
    category: "General",
  },
  {
    shortcut: "/hold",
    title: "Please Hold",
    content: "Please give me a moment while I look into this for you.",
    category: "General",
  },
  {
    shortcut: "/pricing",
    title: "Pricing Info",
    content: "I'd be happy to help with pricing information. Could you let me know which specific products you're interested in?",
    category: "Sales",
  },
  {
    shortcut: "/order",
    title: "Order Status",
    content: "I can help you check on your order status. Could you please provide your order number?",
    category: "Support",
  },
  {
    shortcut: "/shipping",
    title: "Shipping Info",
    content: "Our standard shipping typically takes 3-5 business days. Express shipping (1-2 days) is also available at checkout.",
    category: "Support",
  },
  {
    shortcut: "/followup",
    title: "Follow Up",
    content: "Just following up on our previous conversation. Is there anything else I can help you with?",
    category: "General",
  },
  {
    shortcut: "/bye",
    title: "Goodbye",
    content: "Thanks for chatting with us today! Feel free to reach out if you have any more questions. Have a great day!",
    category: "General",
  },
];

export function CannedResponsesForm() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit/Create state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    shortcut: "",
    category: "",
  });

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const response = await fetch("/api/admin/canned-responses");
      if (!response.ok) throw new Error("Failed to fetch canned responses");
      const data = await response.json();
      const dbResponses = data.responses || [];

      // If database is empty, automatically seed with defaults
      if (dbResponses.length === 0) {
        await seedDefaults();
        return; // seedDefaults will call fetchResponses again
      }

      setResponses(dbResponses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load canned responses");
    } finally {
      setIsLoading(false);
    }
  };

  // Seed defaults without confirmation (used on initial load)
  const seedDefaults = async () => {
    try {
      for (const defaultResponse of DEFAULT_RESPONSES) {
        await fetch("/api/admin/canned-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultResponse),
        });
      }
      // Refetch after seeding
      const response = await fetch("/api/admin/canned-responses");
      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses || []);
      }
    } catch (err) {
      console.error("Failed to seed defaults:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    // Check which defaults are missing
    const missingDefaults = DEFAULT_RESPONSES.filter(
      (d) => !responses.some((r) => r.shortcut.toLowerCase() === d.shortcut.toLowerCase())
    );

    if (missingDefaults.length === 0) {
      setSuccessMessage("All default responses already exist");
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    if (!confirm(`This will add ${missingDefaults.length} default canned response(s). Continue?`)) {
      return;
    }

    setIsSeeding(true);
    setError(null);

    try {
      for (const defaultResponse of missingDefaults) {
        await fetch("/api/admin/canned-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultResponse),
        });
      }

      setSuccessMessage(`${missingDefaults.length} default response(s) added successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed defaults");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ title: "", content: "", shortcut: "/", category: "" });
  };

  const handleEdit = (response: CannedResponse) => {
    setEditingId(response.id);
    setIsCreating(false);
    setFormData({
      title: response.title,
      content: response.content,
      shortcut: response.shortcut,
      category: response.category || "",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ title: "", content: "", shortcut: "", category: "" });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.shortcut.trim()) {
      setError("Title, content, and shortcut are required");
      return;
    }

    // Ensure shortcut starts with /
    let shortcut = formData.shortcut.trim();
    if (!shortcut.startsWith("/")) {
      shortcut = "/" + shortcut;
    }

    // Validate shortcut format (alphanumeric and hyphens only after /)
    if (!/^\/[a-zA-Z0-9-]+$/.test(shortcut)) {
      setError("Shortcut must start with / and contain only letters, numbers, and hyphens");
      return;
    }

    // Check for duplicate shortcut
    const isDuplicate = responses.some(
      (r) => r.shortcut.toLowerCase() === shortcut.toLowerCase() && r.id !== editingId
    );
    if (isDuplicate) {
      setError("This shortcut is already in use");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = editingId
        ? `/api/admin/canned-responses/${editingId}`
        : "/api/admin/canned-responses";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          shortcut,
          category: formData.category || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save canned response");
      }

      setSuccessMessage(editingId ? "Response updated successfully" : "Response created successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      handleCancel();
      fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save canned response");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this canned response?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/canned-responses/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete canned response");
      }

      setSuccessMessage("Response deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete canned response");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Canned Responses</h2>
          <p className="text-sm text-gray-500">
            Create quick responses with shortcuts (e.g., type /greeting in chat)
          </p>
        </div>
        {!isCreating && !editingId && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSeedDefaults}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Add Defaults
            </Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Response
            </Button>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquareText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {editingId ? "Edit Canned Response" : "New Canned Response"}
              </h3>
              <p className="text-sm text-gray-500">
                {editingId ? "Update the response details" : "Create a new quick response"}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Welcome Greeting"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortcut">Shortcut</Label>
                <div className="relative">
                  <Command className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="shortcut"
                    value={formData.shortcut}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Auto-add / prefix if not present
                      if (value && !value.startsWith("/")) {
                        value = "/" + value;
                      }
                      setFormData({ ...formData, shortcut: value });
                    }}
                    placeholder="/greeting"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Type this shortcut in chat to insert the response
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Response Content</Label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your canned response text here..."
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? "Update" : "Create"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Responses List */}
      <div className="space-y-3">
        {responses.length === 0 ? (
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <MessageSquareText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No canned responses yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create your first canned response or add the default set to get started
            </p>
            {!isCreating && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedDefaults}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Add Defaults
                </Button>
                <Button onClick={handleCreate} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom
                </Button>
              </div>
            )}
          </div>
        ) : (
          responses.map((response) => (
            <div
              key={response.id}
              className={`bg-white rounded-lg border p-4 transition-colors ${
                editingId === response.id ? "border-blue-300 bg-blue-50/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{response.title}</h4>
                    <code className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                      {response.shortcut}
                    </code>
                    {response.category && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded capitalize">
                        {response.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{response.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(response)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(response.id)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-medium text-gray-900 mb-2">How to use canned responses:</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>Type the shortcut (e.g., <code className="px-1 bg-gray-200 rounded">/greeting</code>) in the chat input</li>
          <li>The full response will automatically replace the shortcut</li>
          <li>Shortcuts must start with <code className="px-1 bg-gray-200 rounded">/</code> and can contain letters, numbers, and hyphens</li>
        </ul>
      </div>
    </div>
  );
}
