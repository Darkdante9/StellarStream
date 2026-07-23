"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type VoteChoice } from "@/lib/governance-client";

interface VotingInterfaceProps {
  proposalId: string;
  isConnected: boolean;
  isSubmitting: boolean;
  votingPower: string;
  userVote: VoteChoice | null;
  onVote: (proposalId: string, vote: VoteChoice) => void;
}

export function VotingInterface({
  proposalId,
  isConnected,
  isSubmitting,
  votingPower,
  userVote,
  onVote,
}: VotingInterfaceProps) {
  const [showConfirm, setShowConfirm] = useState<VoteChoice | null>(null);

  const handleConfirm = () => {
    if (showConfirm) {
      onVote(proposalId, showConfirm);
      setShowConfirm(null);
    }
  };

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/80">Cast Your Vote</h3>
        <div className="group relative flex items-center gap-2 text-xs">
          <span className="text-white/40 uppercase tracking-wider text-[10px]">Your Power:</span>
          <span className="text-white font-medium bg-white/10 px-2 py-0.5 rounded-md cursor-help border border-white/10">
            {isConnected ? votingPower : "0"}
          </span>
          {/* Tooltip */}
          <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-[10px] p-2 rounded-lg border border-white/10 shadow-xl z-10">
            Voting power is calculated based on your total streamed volume.
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          disabled={!isConnected || isSubmitting || userVote !== null}
          onClick={() => setShowConfirm("yes")}
          className={`relative overflow-hidden flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
            userVote === "yes"
              ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              : userVote !== null
              ? "opacity-30 border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
              : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {userVote === "yes" ? "Voted Yes" : "Vote Yes"}
        </button>
        <button
          disabled={!isConnected || isSubmitting || userVote !== null}
          onClick={() => setShowConfirm("no")}
          className={`relative overflow-hidden flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
            userVote === "no"
              ? "bg-red-500 border-red-400 text-black shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              : userVote !== null
              ? "opacity-30 border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
              : "border-red-400/40 bg-red-400/10 text-red-300 hover:bg-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {userVote === "no" ? "Voted No" : "Vote No"}
        </button>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-3xl bg-[#0f0f13] border border-white/10 p-6 shadow-2xl"
            >
              <h3 className="font-heading text-xl text-white mb-2">Confirm Vote</h3>
              <p className="text-white/60 text-sm mb-6">
                Are you sure you want to cast a <strong className={showConfirm === "yes" ? "text-emerald-400" : "text-red-400"}>{showConfirm.toUpperCase()}</strong> vote with {votingPower} voting power? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium text-black transition-colors ${
                    showConfirm === "yes" ? "bg-emerald-400 hover:bg-emerald-300" : "bg-red-400 hover:bg-red-300"
                  }`}
                >
                  Confirm Vote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}