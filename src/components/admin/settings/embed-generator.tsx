"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Copy,
  Check,
  Code,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import type { User } from "@/types";

type EmbedType = "script" | "iframe";

export function EmbedGenerator() {
  const [reps, setReps] = useState<User[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [embedType, setEmbedType] = useState<EmbedType>("script");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    // Get the base URL from environment variable or fallback to current window origin
    if (typeof window !== "undefined") {
      setBaseUrl(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin);
    }
    fetchReps();
  }, []);

  const fetchReps = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      // Filter to only show active reps
      const activeReps = data.users.filter(
        (user: User) => user.role === "rep" && user.isActive && user.repId
      );
      setReps(activeReps);
      if (activeReps.length > 0) {
        setSelectedRepId(activeReps[0].repId);
      }
    } catch (err) {
      console.error("Failed to fetch reps:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateScriptCode = useCallback(() => {
    return `<!-- Peptide Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['PeptideChat']=o;w[o]=w[o]||function(){
      (w[o].q=w[o].q||[]).push(arguments)
    };
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','peptideChat','${baseUrl}/widget.js');
  peptideChat('init', { repId: '${selectedRepId}' });
</script>`;
  }, [baseUrl, selectedRepId]);

  const generateIframeCode = useCallback(() => {
    return `<!-- Peptide Chat Widget (iframe) -->
<iframe
  src="${baseUrl}/embed/widget?repId=${selectedRepId}"
  style="position:fixed;bottom:0;right:0;width:100%;height:100%;border:none;pointer-events:auto;z-index:9999;"
  allow="microphone"
></iframe>`;
  }, [baseUrl, selectedRepId]);

  const getEmbedCode = () => {
    return embedType === "script" ? generateScriptCode() : generateIframeCode();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
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
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Embed Code Generator</h2>
        <p className="text-sm text-gray-500">
          Generate embed code to add the chat widget to your website
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          {/* Rep Selection */}
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <h3 className="font-medium text-gray-900">Configuration</h3>

            <div className="space-y-2">
              <Label htmlFor="rep-select">Select Rep</Label>
              {reps.length === 0 ? (
                <div className="p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                  No active reps with Rep IDs found. Please create a rep account
                  with a Rep ID in User Management.
                </div>
              ) : (
                <select
                  id="rep-select"
                  value={selectedRepId}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.repId}>
                      {rep.name} ({rep.repId})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500">
                Conversations will be routed to this rep
              </p>
            </div>

            <div className="space-y-2">
              <Label>Embed Type</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEmbedType("script")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    embedType === "script"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Code className="h-4 w-4" />
                  Script Tag
                </button>
                <button
                  onClick={() => setEmbedType("iframe")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    embedType === "iframe"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  IFrame
                </button>
              </div>
            </div>
          </div>

          {/* Code Output */}
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Embed Code</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!selectedRepId}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-64">
                <code>{getEmbedCode()}</code>
              </pre>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              {embedType === "script" ? (
                <>
                  <p>
                    <strong>Recommended:</strong> Add this code just before the
                    closing <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag.
                  </p>
                  <p>
                    The widget will automatically load and display a floating chat
                    bubble.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Note:</strong> The iframe method is simpler but less
                    customizable.
                  </p>
                  <p>
                    Adjust the <code className="bg-gray-100 px-1 rounded">style</code> attribute to change position and size.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Direct Link */}
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <h3 className="font-medium text-gray-900">Direct Chat Link</h3>
            <p className="text-sm text-gray-500">
              Share this link directly with customers (e.g., in Instagram bio)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${baseUrl}/c/${selectedRepId}`}
                className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-600"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${baseUrl}/c/${selectedRepId}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-4">
          <div className="bg-gray-100 rounded-lg p-4 h-[500px] relative overflow-hidden">
            <p className="text-xs text-gray-500 mb-4 text-center">Preview</p>

            {/* Mock browser window */}
            <div className="absolute inset-4 top-10 bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Browser chrome */}
              <div className="h-8 bg-gray-100 border-b flex items-center px-3 gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-5 bg-white rounded px-2 text-xs text-gray-400 flex items-center">
                    yourwebsite.com
                  </div>
                </div>
              </div>

              {/* Page content */}
              <div className="h-[calc(100%-2rem)] flex flex-col items-center justify-center text-gray-300 p-4">
                <div className="h-8 w-32 bg-gray-100 rounded mb-4" />
                <div className="h-4 w-48 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-40 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-44 bg-gray-100 rounded" />
              </div>

              {/* Widget bubble */}
              {selectedRepId && (
                <div className="absolute right-4 bottom-4">
                  <button className="h-14 w-14 rounded-full bg-blue-600 shadow-lg flex items-center justify-center transition-transform hover:scale-110 animate-pulse">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 text-sm mb-2">
              Integration Steps
            </h4>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Select the rep who will receive chat requests</li>
              <li>Choose your preferred embed type</li>
              <li>Copy the generated code</li>
              <li>Paste it into your website&apos;s HTML</li>
              <li>Test the chat widget on your site</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
