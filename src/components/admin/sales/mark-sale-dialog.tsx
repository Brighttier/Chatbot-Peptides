"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface MarkSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  customerName: string;
  channel: "website" | "instagram";
  isSuperAdmin?: boolean;
  onSuccess?: (saleId: string) => void;
}

export function MarkSaleDialog({
  isOpen,
  onClose,
  conversationId,
  customerName,
  channel,
  isSuperAdmin = false,
  onSuccess,
}: MarkSaleDialogProps) {
  const [saleAmount, setSaleAmount] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const commissionRate = channel === "website" ? 10 : 5;
  const calculatedCommission = saleAmount
    ? (parseFloat(saleAmount) * commissionRate) / 100
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          saleAmount: parseFloat(saleAmount),
          productDetails,
          saleDate,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mark sale");
      }

      setSuccess(true);
      if (onSuccess) {
        onSuccess(data.saleId);
      }

      // Close dialog after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSaleAmount("");
    setProductDetails("");
    setNotes("");
    setSaleDate(new Date().toISOString().split("T")[0]);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mark Sale</h2>
              <p className="text-sm text-gray-500">{customerName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Channel Badge - Only visible to Super Admin */}
          {isSuperAdmin && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Channel</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  channel === "website"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {channel === "website" ? "Website (10%)" : "Instagram (5%)"}
              </span>
            </div>
          )}

          {/* Sale Amount */}
          <div className="space-y-2">
            <Label htmlFor="saleAmount">Sale Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="saleAmount"
                type="number"
                step="0.01"
                min="0.01"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                className="pl-7"
                placeholder="0.00"
                required
              />
            </div>
            {/* Commission display - Only visible to Super Admin */}
            {isSuperAdmin && saleAmount && (
              <p className="text-sm text-green-600">
                Commission: ${calculatedCommission.toFixed(2)} ({commissionRate}
                %)
              </p>
            )}
          </div>

          {/* Sale Date */}
          <div className="space-y-2">
            <Label htmlFor="saleDate">Sale Date</Label>
            <Input
              id="saleDate"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>

          {/* Product Details */}
          <div className="space-y-2">
            <Label htmlFor="productDetails">Product Details (optional)</Label>
            <Input
              id="productDetails"
              type="text"
              value={productDetails}
              onChange={(e) => setProductDetails(e.target.value)}
              placeholder="e.g., BPC-157 5mg x 2"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Sale marked successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isSubmitting || !saleAmount || success}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Done
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Mark Sale
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
