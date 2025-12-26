"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  TrendingUp,
  Globe,
  Instagram,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Loader2,
  ExternalLink,
  Eye,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import type { Sale, CommissionSummary, SaleStatus, SaleChannel } from "@/types";

export function CommissionDashboard() {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [channelFilter, setChannelFilter] = useState<SaleChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "all">("all");

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch summary
      const summaryRes = await fetch(
        `/api/admin/sales/summary?startDate=${startDate}&endDate=${endDate}`
      );
      if (!summaryRes.ok) throw new Error("Failed to fetch summary");
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      // Fetch sales list
      const params = new URLSearchParams({
        startDate,
        endDate,
        limit: "100",
      });
      if (channelFilter !== "all") params.set("channel", channelFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const salesRes = await fetch(`/api/admin/sales?${params}`);
      if (!salesRes.ok) throw new Error("Failed to fetch sales");
      const salesData = await salesRes.json();
      setSales(salesData.sales || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, channelFilter, statusFilter]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        includeEvidence: "true",
      });
      if (channelFilter !== "all") params.set("channel", channelFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/sales/export?${params}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerify = async (saleId: string) => {
    setActionLoading(saleId);
    try {
      const response = await fetch(`/api/admin/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "verified",
          reason: "Verified by super admin",
        }),
      });
      if (!response.ok) throw new Error("Failed to verify sale");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispute = async (saleId: string) => {
    const reason = prompt("Enter reason for dispute:");
    if (!reason) return;

    setActionLoading(saleId);
    try {
      const response = await fetch(`/api/admin/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "disputed",
          reason,
        }),
      });
      if (!response.ok) throw new Error("Failed to dispute sale");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispute");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: SaleStatus) => {
    const styles: Record<SaleStatus, string> = {
      verified: "bg-green-100 text-green-700",
      pending_review: "bg-amber-100 text-amber-700",
      disputed: "bg-red-100 text-red-700",
      rejected: "bg-gray-100 text-gray-700",
    };
    const labels: Record<SaleStatus, string> = {
      verified: "Verified",
      pending_review: "Pending Review",
      disputed: "Disputed",
      rejected: "Rejected",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getChannelBadge = (channel: SaleChannel) => {
    return channel === "website" ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Globe className="h-3 w-3" />
        Website (10%)
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <Instagram className="h-3 w-3" />
        Instagram (5%)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Commission Tracking
          </h2>
          <p className="text-sm text-gray-500">
            Track sales and commissions from chat conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Commission */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700">Total Commission</p>
                <p className="text-2xl font-bold text-green-800">
                  ${summary.totalCommission.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Sales */}
          <div className="p-4 bg-white rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${summary.totalSaleAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{summary.totalSales} sale(s)</p>
              </div>
            </div>
          </div>

          {/* Website Sales */}
          <div className="p-4 bg-white rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Website (10%)</p>
                <p className="text-lg font-bold text-gray-900">
                  ${summary.websiteSales.commission.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  {summary.websiteSales.count} sale(s) - ${summary.websiteSales.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Instagram Sales */}
          <div className="p-4 bg-white rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Instagram className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Instagram (5%)</p>
                <p className="text-lg font-bold text-gray-900">
                  ${summary.instagramSales.commission.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  {summary.instagramSales.count} sale(s) - ${summary.instagramSales.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Review */}
          <div className="p-4 bg-white rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">
                  {summary.pendingReviewCount}
                </p>
                <p className="text-xs text-gray-400">
                  {summary.verifiedCount} verified, {summary.disputedCount} disputed
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="startDate" className="text-xs">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endDate" className="text-xs">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="channel" className="text-xs">Channel</Label>
          <select
            id="channel"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as SaleChannel | "all")}
            className="h-10 px-3 rounded-md border border-gray-300 text-sm"
          >
            <option value="all">All Channels</option>
            <option value="website">Website (10%)</option>
            <option value="instagram">Instagram (5%)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status" className="text-xs">Status</Label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SaleStatus | "all")}
            className="h-10 px-3 rounded-md border border-gray-300 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending_review">Pending Review</option>
            <option value="verified">Verified</option>
            <option value="disputed">Disputed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Commission
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rep
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No sales found for the selected period
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {sale.saleDate?.toDate?.()
                        ? new Date(sale.saleDate.toDate()).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {sale.customerName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sale.customerInstagram || sale.customerPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getChannelBadge(sale.channel)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${sale.saleAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      ${sale.commissionAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(sale.status)}
                        {sale.status === "disputed" && sale.disputeReason && (
                          <span className="text-xs text-red-600 italic max-w-[150px] truncate" title={sale.disputeReason}>
                            {sale.disputeReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sale.repInfo.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a
                          href={`/admin?conversation=${sale.conversationId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title="View conversation"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {sale.status === "pending_review" && (
                          <>
                            <button
                              onClick={() => sale.id && handleVerify(sale.id)}
                              disabled={actionLoading === sale.id}
                              className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                              title="Verify sale"
                            >
                              {actionLoading === sale.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => sale.id && handleDispute(sale.id)}
                              disabled={actionLoading === sale.id}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                              title="Dispute sale"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>Website (10%):</strong> Sales from embedded chat widget on customer's website
        </p>
        <p>
          <strong>Instagram (5%):</strong> Sales from direct link shared on Instagram
        </p>
      </div>
    </div>
  );
}
