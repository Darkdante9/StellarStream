"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VotingInterface } from "./voting-interface";
import { type GovernanceProposal, type VoteChoice } from "@/lib/governance-client";

function shortAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function fmtNumber(value: number): string {
  return value.toLocaleString("en-US");
}

interface ProposalCardProps {
  proposal: GovernanceProposal;
  isConnected: boolean;
  isSubmitting: boolean;
  votingPower: string;
  userVote: VoteChoice | null;
  onVote: (proposalId: string, vote: VoteChoice) => void;
}

export function ProposalCard({
  proposal,
  isConnected,
  isSubmitting,
  votingPower,
  userVote,
  onVote,
}: ProposalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const total = proposal.votesFor + proposal.votesAgainst;
  const supportRatio = total > 0 ? (proposal.votesFor / total) * 100 : 0;
  const quorumRatio = Math.min(100, (total / (proposal.quorum || 1)) * 100);

  // Simulated countdown timer based on proposal ID or just a fixed 3 days
  useEffect(() => {
    // Determine an end date (mocking for UI display as requested by requirements)
    const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - parseInt(proposal.id || "0") * 3600000);
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft("Ended");
        clearInterval(interval);
        return;
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      
      setTimeLeft(`${d}d ${h}h ${m}m left`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [proposal.id]);

  return (
    <motion.article
      layout
      className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden transition-all hover:border-white/20"
    >
      <div 
        className="p-6 cursor-pointer select-none flex flex-col md:flex-row md:items-start justify-between gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-ticker text-[10px] uppercase tracking-[0.2em] text-white/40">
              Proposal {proposal.id}
            </p>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-ticker text-[9px] tracking-wider uppercase text-emerald-300">
                Active
              </span>
            </div>
            {timeLeft && (
              <div className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                <span className="font-ticker text-[9px] tracking-wider uppercase text-white/60">
                  {timeLeft}
                </span>
              </div>
            )}
          </div>
          <h2 className="font-heading text-xl md:text-2xl text-white">
            {proposal.description || "Untitled proposal"}
          </h2>
          <p className="mt-2 text-xs text-white/40 font-body flex items-center gap-2">
            Proposed by 
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-white/70">
              {shortAddress(proposal.creator)}
            </span>
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-4 text-sm text-right">
          <div className="hidden sm:block">
            <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Support</p>
            <p className="font-medium text-emerald-400">{supportRatio.toFixed(1)}%</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Total Votes</p>
            <p className="font-medium text-white">{fmtNumber(total)}</p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/50"
          >
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 border-t border-white/5 bg-black/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                {/* Voting Stats */}
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-white/60">Yes / For</span>
                      <span className="text-emerald-400 font-medium">{fmtNumber(proposal.votesFor)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${total > 0 ? (proposal.votesFor / total) * 100 : 0}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-full bg-emerald-400"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-white/60">No / Against</span>
                      <span className="text-red-400 font-medium">{fmtNumber(proposal.votesAgainst)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${total > 0 ? (proposal.votesAgainst / total) * 100 : 0}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full bg-red-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Quorum Info */}
                <div className="flex flex-col justify-center rounded-2xl bg-white/5 border border-white/5 p-5">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Quorum Progress</p>
                      <p className="font-heading text-lg text-white">
                        {fmtNumber(total)} <span className="text-white/30 text-sm">/ {fmtNumber(proposal.quorum)}</span>
                      </p>
                    </div>
                    <p className="text-xs font-medium text-white/70">{quorumRatio.toFixed(1)}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${quorumRatio}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                      className={`h-full ${quorumRatio >= 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
                    />
                  </div>
                </div>
              </div>

              <VotingInterface
                proposalId={proposal.id}
                isConnected={isConnected}
                isSubmitting={isSubmitting}
                votingPower={votingPower}
                userVote={userVote}
                onVote={onVote}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}