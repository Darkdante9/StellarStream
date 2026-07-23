"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Transaction {
  hash: string;
  type: "stream" | "pause" | "resume" | "cancel" | "withdraw";
  amount: number;
  token: string;
  timestamp: string;
  status: "confirmed" | "pending" | "failed";
}

interface TransactionHistoryProps {
  streamId: string;
  token: string;
}

// Mock transaction generator for demo
function generateMockTransactions(
  streamId: string,
  token: string,
): Transaction[] {
  const types: Transaction["type"][] = [
    "stream",
    "withdraw",
    "stream",
    "pause",
    "resume",
    "stream",
    "stream",
    "withdraw",
    "stream",
    "cancel",
    "stream",
    "stream",
    "stream",
    "withdraw",
    "stream",
    "stream",
    "pause",
    "resume",
    "stream",
    "stream",
    "withdraw",
    "stream",
    "stream",
    "stream",
    "stream",
    "withdraw",
    "stream",
    "stream",
    "stream",
    "stream",
  ];

  const statuses: Transaction["status"][] = [
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "pending",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "failed",
  ];

  return types.map((type, i) => ({
    hash: `${streamId.slice(0, 8)}${String(i).padStart(4, "0")}abcdef`,
    type,
    amount: Math.random() * 500 + 10,
    token,
    timestamp: new Date(
      Date.now() - i * 3600000 * (Math.random() * 24 + 1),
    ).toISOString(),
    status: statuses[i] || "confirmed",
  }));
}

/**
 * Transaction History — paginated list of stream transactions with type icons,
 * status badges, and smooth animations. 20 items per page.
 */
export function TransactionHistory({
  streamId,
  token,
}: TransactionHistoryProps) {
  const [page, setPage] = useState(1);
  const perPage = 20;

  const allTransactions = useMemo(
    () => generateMockTransactions(streamId, token),
    [streamId, token],
  );

  const totalPages = Math.ceil(allTransactions.length / perPage);
  const paginatedTxs = allTransactions.slice(
    (page - 1) * perPage,
    page * perPage,
  );

  const getTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "stream":
        return (
          <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        );
      case "pause":
        return (
          <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "resume":
        return (
          <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "cancel":
        return (
          <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "withdraw":
        return (
          <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
    }
  };

  const getStatusBadge = (status: Transaction["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-body text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Confirmed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-body text-[10px] font-medium text-amber-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-body text-[10px] font-medium text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            Failed
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <p className="font-body text-[10px] uppercase tracking-widest text-white/35">
          Transaction History
        </p>
        <span className="font-ticker text-[10px] text-white/25">
          {allTransactions.length} total
        </span>
      </div>

      {/* Transactions list */}
      <div className="divide-y divide-white/5">
        <AnimatePresence mode="popLayout">
          {paginatedTxs.map((tx, idx) => (
            <motion.div
              key={tx.hash}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
            >
              {/* Type icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03]">
                {getTypeIcon(tx.type)}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs capitalize text-white/70">
                    {tx.type}
                  </span>
                  {getStatusBadge(tx.status)}
                </div>
                <p className="font-ticker text-[10px] text-white/25">
                  {tx.hash.slice(0, 12)}...
                </p>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className="font-ticker text-xs font-semibold text-white/80">
                  {tx.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="font-body text-[10px] text-white/25">{tx.token}</p>
              </div>

              {/* Time */}
              <p className="hidden w-20 text-right font-body text-[10px] text-white/25 sm:block">
                {new Date(tx.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 font-body text-[11px] text-white/40 transition-colors hover:border-white/20 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-lg font-ticker text-[11px] transition-all ${
                  p === page
                    ? "bg-[#00f5ff]/15 text-[#00f5ff]"
                    : "text-white/30 hover:bg-white/5 hover:text-white/50"
                }`}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 font-body text-[11px] text-white/40 transition-colors hover:border-white/20 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            Next
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </motion.div>
  );
}