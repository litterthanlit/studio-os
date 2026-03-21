"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type AIPreviewBarProps = {
  onAccept: () => void;
  onReject: () => void;
  onVary: () => void;
};

export function AIPreviewBar({ onAccept, onReject, onVary }: AIPreviewBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="bg-[#D1E4FC]/15 border border-[#D1E4FC] rounded-[4px] p-3 mx-3 mt-3 mb-2"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-[#1E5DF2] shrink-0" strokeWidth={1.5} />
        <span className="text-[12px] text-[#1A1A1A] font-medium">AI made changes</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="bg-[#1E5DF2] text-white rounded-[4px] px-3 py-1.5 text-[12px] font-medium hover:bg-[#1A4FD6] transition-colors"
          onClick={onAccept}
        >
          Accept
        </button>
        <button
          type="button"
          className="border border-[#E5E5E0] rounded-[4px] px-3 py-1.5 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2] transition-colors"
          onClick={onReject}
        >
          Reject
        </button>
        <button
          type="button"
          className="border border-[#E5E5E0] rounded-[4px] px-3 py-1.5 text-[12px] text-[#6B6B6B] hover:border-[#D1E4FC] hover:text-[#1E5DF2] transition-colors"
          onClick={onVary}
        >
          Vary
        </button>
      </div>
    </motion.div>
  );
}
