"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import {
  type GovernanceProposal,
  type VoteChoice,
  type VotingPowerSnapshot,
  fetchGovernanceProposals,
  fetchVotingPower,
  voteOnProposal,
} from "@/lib/governance-client";

import { ProposalCard } from "@/components/governance/proposal-card";
import { TreasuryStats } from "@/components/governance/treasury-stats";

function fmtNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function fmtBigintString(value: string): string {
  const asBigInt = BigInt(value || "0");
  return asBigInt.toLocaleString("en-US");
}

export default function GovernancePage() {
  const { isConnected, address } = useWallet();

  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPowerSnapshot | null>(null);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingPower, setLoadingPower] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
  
  // Track user votes to display in UI instantly
  const [userVotes, setUserVotes] = useState<Record<string, VoteChoice>>({});

  useEffect(() => {
    let cancelled = false;

    const loadProposals = async () => {
      setLoadingProposals(true);
      setError(null);
      try {
        const next = await fetchGovernanceProposals();
        if (!cancelled) {
          setProposals(next);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load proposals",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProposals(false);
        }
      }
    };

    loadProposals();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadVotingPower = async () => {
      if (!address) {
        setVotingPower(null);
        return;
      }

      setLoadingPower(true);
      try {
        const next = await fetchVotingPower(address);
        if (!cancelled) {
          setVotingPower(next);
        }
      } catch {
        if (!cancelled) {
          setVotingPower(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingPower(false);
        }
      }
    };

    loadVotingPower();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const activeCount = proposals.length;
  const totalVotes = useMemo(
    () =>
      proposals.reduce(
        (sum, proposal) => sum + proposal.votesFor + proposal.votesAgainst,
        0,
      ),
    [proposals],
  );

  const handleVote = async (proposalId: string, vote: VoteChoice) => {
    if (!address) {
      setError("Connect your wallet to vote.");
      return;
    }

    setPendingProposalId(proposalId);
    setError(null);

    try {
      await voteOnProposal(proposalId, address, vote);

      setUserVotes(prev => ({ ...prev, [proposalId]: vote }));
      
      setProposals((current) =>
        current.map((proposal) => {
          if (proposal.id !== proposalId) return proposal;
          return {
            ...proposal,
            votesFor:
              vote === "yes" ? proposal.votesFor + 1 : proposal.votesFor,
            votesAgainst:
              vote === "no" ? proposal.votesAgainst + 1 : proposal.votesAgainst,
          };
        }),
      );
    } catch (voteError) {
      setError(
        voteError instanceof Error
          ? voteError.message
          : "Vote transaction failed",
      );
    } finally {
      setPendingProposalId(null);
    }
  };

  const powerDisplay = loadingPower
    ? "…"
    : votingPower
      ? fmtBigintString(votingPower.votingPower)
      : "0";

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#8a00ff]/20 via-black to-black p-8 md:p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8a00ff]/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-ticker text-[10px] tracking-widest text-white/70 uppercase">
                Nebula DAO Live
              </span>
            </div>
            <h1 className="font-heading text-4xl md:text-6xl text-white tracking-tight">
              Governance
            </h1>
            <p className="font-body mt-4 text-white/50 max-w-xl text-sm md:text-base leading-relaxed">
              Shape the future of StellarStream. Use your streaming volume as voting power to direct treasury funds and protocol upgrades.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Your Power</p>
              <p className="font-heading text-2xl text-white">{powerDisplay}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Active</p>
              <p className="font-heading text-2xl text-[#b84dff]">{activeCount} <span className="text-white/30 text-sm">Props</span></p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Proposals List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-heading text-2xl text-white">Active Proposals</h2>
            <div className="text-sm text-white/40">{fmtNumber(totalVotes)} total votes cast</div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </motion.div>
          )}

          {!isConnected && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200 flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Connect your wallet to calculate your voting power and participate.
            </motion.div>
          )}

          {loadingProposals ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[140px] rounded-3xl bg-white/5 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-white/5 p-12 text-center">
              <p className="text-white/40 text-lg">No active proposals right now.</p>
              <p className="text-white/20 text-sm mt-2">Check back later or start a discussion in the forum.</p>
            </div>
          ) : (
            <motion.div layout className="flex flex-col gap-4">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isConnected={isConnected}
                  isSubmitting={pendingProposalId === proposal.id}
                  votingPower={powerDisplay}
                  userVote={userVotes[proposal.id] || null}
                  onVote={handleVote}
                />
              ))}
            </motion.div>
          )}
        </div>

        {/* Right Column: Treasury & Stats */}
        <div className="space-y-6">
          <TreasuryStats />
          
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <h3 className="font-heading text-lg text-white mb-4">Protocol Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/50">Total Streamed</span>
                  <span className="text-white">
                    {loadingPower ? "…" : votingPower ? fmtBigintString(votingPower.activeStreamingVolume) : "-"}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-blue-400 w-3/4" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/50">Voter Participation</span>
                  <span className="text-white">42.5%</span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#8a00ff] w-[42.5%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}