"use client";

// Intent Card (master plan 1.8): what the last run understood — measured facts
// and the reference each came from, assigned / ignored roles — plus at most one
// open question whose answer re-runs generation.

import * as React from "react";
import type { IntentCardModel } from "@/lib/intent/reference-actions";

type IntentCardProps = {
  model: IntentCardModel;
  disabled?: boolean;
  onAnswer: (questionId: string, option: string) => void;
};

export function IntentCard({ model, disabled, onAnswer }: IntentCardProps) {
  const headingId = React.useId();
  if (model.rows.length === 0 && !model.question) return null;
  return (
    <section aria-labelledby={headingId} className="border-b border-[#E5E5E0] px-3 py-2 dark:border-[#333333]">
      <h3 id={headingId} className="mono-kicker mb-1">
        Understood
      </h3>
      <ul className="flex flex-col">
        {model.rows.map((row) => (
          <li key={row.id} className="flex min-h-[40px] items-center justify-between gap-2 border-b border-[#EFEFEC] py-1 last:border-b-0 dark:border-[#2A2A2A]">
            <span className="text-[12px] leading-[16px] text-[#1A1A1A] dark:text-[#D0D0D0]">{row.text}</span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.5px] text-[#A0A0A0]">{row.source}</span>
          </li>
        ))}
      </ul>
      {model.question && (
        <div className="mt-2 rounded-[4px] border border-[#D1E4FC] bg-[#EDF1FE] p-2 dark:border-[#29336F] dark:bg-[#171B2E]" role="group" aria-label="Question">
          <p className="mb-1.5 text-[12px] leading-[16px] text-[#1A1A1A] dark:text-[#D0D0D0]">{model.question.prompt}</p>
          <div className="flex flex-wrap gap-1.5">
            {model.question.options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onAnswer(model.question!.id, option)}
                className="rounded-[4px] border border-[#E5E5E0] bg-white px-2 py-1 text-[11px] capitalize text-[#1A1A1A] outline-none transition-colors hover:border-[#4B57DB] focus-visible:ring-2 focus-visible:ring-[#D1E4FC] disabled:opacity-50 dark:border-[#333333] dark:bg-[#222222] dark:text-[#D0D0D0]"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
