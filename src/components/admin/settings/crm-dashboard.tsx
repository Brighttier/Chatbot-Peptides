"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Phone, Instagram, Calendar, MessageSquare, Search, Mail, Target, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  instagram?: string;
  email?: string;
  dateOfBirth?: string;
  conversationCount: number;
  lastContactDate: string;
  intakeAnswers?: {
    goals?: string[];
    stage?: string;
    interest?: string[];
  };
}

function CustomerDetails({ customer }: { customer: CustomerRecord }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-2xl font-bold text-blue-600">
            {customer.firstName?.[0] || "?"}{customer.lastName?.[0] || ""}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {customer.firstName} {customer.lastName}
          </h2>
          <p className="text-sm text-gray-500">
            {customer.conversationCount} conversation{customer.conversationCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900 border-b pb-2">Contact Information</h3>

        <div className="grid gap-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-medium">{customer.phone}</p>
            </div>
          </div>

          {customer.instagram && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Instagram className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Instagram</p>
                <p className="font-medium text-purple-600">@{customer.instagram.replace("@", "")}</p>
              </div>
            </div>
          )}

          {customer.email && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium">{customer.email}</p>
              </div>
            </div>
          )}

          {customer.dateOfBirth && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Date of Birth</p>
                <p className="font-medium">{customer.dateOfBirth}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Intake Answers */}
      {customer.intakeAnswers && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 border-b pb-2">Intake Information</h3>

          {customer.intakeAnswers.goals && customer.intakeAnswers.goals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Target className="h-3.5 w-3.5" />
                Goals
              </p>
              <div className="flex flex-wrap gap-2">
                {customer.intakeAnswers.goals.map((goal, i) => (
                  <Badge key={i} variant="secondary">{goal}</Badge>
                ))}
              </div>
            </div>
          )}

          {customer.intakeAnswers.stage && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Journey Stage
              </p>
              <Badge variant="outline">{customer.intakeAnswers.stage}</Badge>
            </div>
          )}

          {customer.intakeAnswers.interest && customer.intakeAnswers.interest.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Interests
              </p>
              <div className="flex flex-wrap gap-2">
                {customer.intakeAnswers.interest.map((interest, i) => (
                  <Badge key={i} variant="secondary">{interest}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900 border-b pb-2">Activity</h3>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Last Contact</p>
          <p className="font-medium">
            {new Date(customer.lastContactDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CRMDashboard() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/customers");
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.phone} ${c.instagram || ""} ${c.email || ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchCustomers}
          className="mt-4 text-blue-500 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Customer Directory</h2>
        <p className="text-sm text-gray-500">
          View customer details from incoming chat conversations
        </p>
      </div>

      <div className="flex h-[calc(100vh-280px)] gap-4">
        {/* Customer List */}
        <div className="w-1/3 min-w-[280px] border rounded-lg bg-white flex flex-col">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Customer count */}
          <div className="px-3 py-2 border-b bg-gray-50 text-xs text-gray-500">
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? "No customers match your search" : "No customers yet"}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full p-3 text-left border-b hover:bg-gray-50 transition-colors ${
                    selectedCustomer?.id === customer.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedCustomer?.id === customer.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                    }`}>
                      {customer.firstName?.[0] || <User className="h-4 w-4" />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {customer.firstName || customer.lastName
                          ? `${customer.firstName} ${customer.lastName}`.trim()
                          : "Unknown"}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1.5 truncate">
                        <Phone className="h-3 w-3 shrink-0" />
                        {customer.phone}
                      </div>
                      {customer.instagram && (
                        <div className="text-sm text-purple-600 flex items-center gap-1.5 truncate">
                          <Instagram className="h-3 w-3 shrink-0" />
                          @{customer.instagram.replace("@", "")}
                        </div>
                      )}
                    </div>

                    {/* Conversation count badge */}
                    <Badge variant="secondary" className="shrink-0">
                      {customer.conversationCount}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Customer Details */}
        <div className="flex-1 border rounded-lg bg-white p-6 overflow-auto">
          {selectedCustomer ? (
            <CustomerDetails customer={selectedCustomer} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a customer to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
