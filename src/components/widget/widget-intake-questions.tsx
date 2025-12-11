"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";

export interface IntakeAnswers {
  goals: string[];
  stage: string;
  interest: string[];
}

interface WidgetIntakeQuestionsProps {
  onSubmit: (answers: IntakeAnswers) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const GOAL_OPTIONS = ["Muscle Growth", "Anti-Aging", "Recovery", "Other"];
const STAGE_OPTIONS = ["Starting a Protocol", "Optimizing Existing Protocol", "Just Researching"];
const INTEREST_OPTIONS = ["Purchasing Peptides", "Coaching Services", "Personalized Advice"];

export function WidgetIntakeQuestions({
  onSubmit,
  onSkip,
  isLoading = false,
}: WidgetIntakeQuestionsProps) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = () => {
    onSubmit({
      goals: selectedGoals,
      stage: selectedStage,
      interest: selectedInterests,
    });
  };

  const hasAnswers = selectedGoals.length > 0 || selectedStage || selectedInterests.length > 0;

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="text-center mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Quick Questions</h2>
        <p className="text-xs text-gray-500 mt-1">
          Help us understand your needs better
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {/* Q1: Goals */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">What results are you hoping to achieve?</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {GOAL_OPTIONS.map((goal) => (
              <label
                key={goal}
                className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                  selectedGoals.includes(goal)
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedGoals.includes(goal)}
                  onChange={() => toggleGoal(goal)}
                  className="h-3 w-3 rounded"
                />
                {goal}
              </label>
            ))}
          </div>
        </div>

        {/* Q2: Stage */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Where are you in your journey?</Label>
          <div className="space-y-1">
            {STAGE_OPTIONS.map((stage) => (
              <label
                key={stage}
                className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                  selectedStage === stage
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="stage"
                  checked={selectedStage === stage}
                  onChange={() => setSelectedStage(stage)}
                  className="h-3 w-3"
                />
                {stage}
              </label>
            ))}
          </div>
        </div>

        {/* Q3: Interest */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">What are you interested in?</Label>
          <div className="space-y-1">
            {INTEREST_OPTIONS.map((interest) => (
              <label
                key={interest}
                className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                  selectedInterests.includes(interest)
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedInterests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  className="h-3 w-3 rounded"
                />
                {interest}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Button
          onClick={handleSubmit}
          className="w-full h-10 bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {hasAnswers ? "Continue" : "Skip & Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
        {hasAnswers && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-xs text-gray-500 hover:text-gray-700"
          >
            Skip these questions
          </button>
        )}
      </div>
    </div>
  );
}
