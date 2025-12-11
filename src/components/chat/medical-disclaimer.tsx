"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, CheckCircle } from "lucide-react";

interface MedicalDisclaimerProps {
  onAccept: () => void;
  companyName?: string;
}

export function MedicalDisclaimer({
  onAccept,
  companyName = "Peptide Chat",
}: MedicalDisclaimerProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-amber-50">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Important Information</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Medical Disclaimer
          </h3>
          <p className="text-sm text-amber-800 leading-relaxed">
            The information provided through {companyName} is for{" "}
            <strong>educational and informational purposes only</strong>. It is
            not intended to be a substitute for professional medical advice,
            diagnosis, or treatment.
          </p>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium text-xs">1</span>
            </div>
            <p>
              <strong>Not Medical Advice:</strong> Any discussion about
              peptides, protocols, or health-related topics is purely
              informational and should not be considered medical advice.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium text-xs">2</span>
            </div>
            <p>
              <strong>Consult Professionals:</strong> Always seek the advice of
              your physician or other qualified health provider with any
              questions you may have regarding a medical condition.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium text-xs">3</span>
            </div>
            <p>
              <strong>No Doctor-Patient Relationship:</strong> Using this chat
              does not create a doctor-patient relationship between you and any
              representative or AI assistant.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium text-xs">4</span>
            </div>
            <p>
              <strong>Emergency Situations:</strong> If you think you may have a
              medical emergency, call your doctor or emergency services
              immediately.
            </p>
          </div>
        </div>

        {/* Acknowledgment checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I understand that this chat is for informational purposes only and
              does not constitute medical advice. I will consult a healthcare
              professional for any medical concerns.
            </span>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <Button
          onClick={onAccept}
          disabled={!acknowledged}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {acknowledged ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              I Understand & Accept
            </>
          ) : (
            "Please acknowledge the disclaimer above"
          )}
        </Button>
      </div>
    </div>
  );
}
