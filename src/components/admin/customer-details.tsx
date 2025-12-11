"use client";

import { Phone, Instagram, MessageCircle, Clock, Hash, User, Calendar, CheckCircle2, XCircle, Target, Compass, ShoppingBag } from "lucide-react";
import type { Conversation } from "@/types";
import { Timestamp } from "firebase/firestore";

interface CustomerDetailsProps {
  conversation: Conversation | null;
}

export function CustomerDetails({ conversation }: CustomerDetailsProps) {
  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center border-l bg-gray-50 text-gray-400">
        <User className="h-12 w-12 mb-2 opacity-30" />
        <p className="text-sm">Select a conversation</p>
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
    <div className="flex h-full flex-col border-l bg-white">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Customer Avatar & Name */}
          <div className="flex flex-col items-center pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <User className="h-8 w-8 text-blue-500" />
            </div>
            <h4 className="font-medium text-gray-900">
              {conversation.customerInfo
                ? `${conversation.customerInfo.firstName} ${conversation.customerInfo.lastName}`
                : conversation.userMobileNumber}
            </h4>
            {conversation.customerInfo && (
              <p className="text-sm text-gray-500 mt-1">
                {conversation.userMobileNumber}
              </p>
            )}
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

          {/* Personal Information */}
          {conversation.customerInfo && (
            <div className="space-y-4">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Personal Information
              </h5>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(conversation.customerInfo.dateOfBirth).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Intake Answers */}
          {conversation.customerInfo?.intakeAnswers && (
            <div className="space-y-4">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Intake Answers
              </h5>

              <div className="space-y-3">
                {/* Goals */}
                {conversation.customerInfo.intakeAnswers.goals?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 flex-shrink-0">
                      <Target className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Goals</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conversation.customerInfo.intakeAnswers.goals.map((goal) => (
                          <span
                            key={goal}
                            className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
                          >
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage */}
                {conversation.customerInfo.intakeAnswers.stage && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                      <Compass className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Journey Stage</p>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 mt-1">
                        {conversation.customerInfo.intakeAnswers.stage}
                      </span>
                    </div>
                  </div>
                )}

                {/* Interests */}
                {conversation.customerInfo.intakeAnswers.interest?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 flex-shrink-0">
                      <ShoppingBag className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Interests</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conversation.customerInfo.intakeAnswers.interest.map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Contact Information
            </h5>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <Phone className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">
                    {conversation.userMobileNumber}
                  </p>
                </div>
              </div>

              {conversation.userInstagramHandle && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <Instagram className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Instagram</p>
                    <p className="text-sm font-medium text-gray-900">
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <MessageCircle className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Chat Mode</p>
                  <p className="text-sm font-medium text-gray-900">
                    {conversation.chatMode === "AI" ? "AI Assistant" : "Human Support"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Started</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(conversation.createdAt)}
                  </p>
                </div>
              </div>

              {conversation.twilioConversationSid && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <Hash className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Twilio SID</p>
                    <p className="text-xs font-mono text-gray-600 break-all">
                      {conversation.twilioConversationSid}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Consent Status */}
          {conversation.customerInfo && (
            <div className="space-y-4">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Consent
              </h5>

              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  conversation.customerInfo.consentGiven ? "bg-green-100" : "bg-red-100"
                }`}>
                  {conversation.customerInfo.consentGiven ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-sm font-medium ${
                    conversation.customerInfo.consentGiven ? "text-green-700" : "text-red-700"
                  }`}>
                    {conversation.customerInfo.consentGiven ? "Consent Given" : "No Consent"}
                  </p>
                  {conversation.customerInfo.consentTimestamp && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(conversation.customerInfo.consentTimestamp)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rep Phone */}
          <div className="space-y-4">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Assigned To
            </h5>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Rep Phone</p>
                <p className="text-sm font-medium text-gray-900">
                  {conversation.repPhoneNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
