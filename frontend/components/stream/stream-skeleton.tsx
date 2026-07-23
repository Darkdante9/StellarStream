"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * Stream Skeleton — loading skeleton for stream detail page.
 * Shows placeholder shimmer effects for all major sections.
 */
export function StreamSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-6 pt-12">
      {/* Header skeleton */}
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/5" />
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-white/5" />
              <div className="h-3 w-24 rounded bg-white/5" />
            </div>
          </div>
          <div className="h-7 w-20 rounded-full bg-white/5" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-16 rounded-xl bg-white/[0.02]" />
          <div className="h-16 rounded-xl bg-white/[0.02]" />
        </div>
        <div className="mt-4 flex gap-4">
          <div className="h-3 w-32 rounded bg-white/5" />
          <div className="h-3 w-24 rounded bg-white/5" />
          <div className="h-3 w-36 rounded bg-white/5" />
        </div>
      </motion.div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="h-56 rounded-2xl border border-white/5 bg-white/[0.02]"
        />
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          className="h-56 rounded-2xl border border-white/5 bg-white/[0.02]"
        />
      </div>

      {/* Chart skeleton */}
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
        className="h-[260px] rounded-2xl border border-white/5 bg-white/[0.02] p-5"
      >
        <div className="h-4 w-36 rounded bg-white/5" />
        <div className="mt-4 h-[200px] rounded bg-white/[0.02]" />
      </motion.div>

      {/* Actions skeleton */}
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="h-24 rounded-2xl border border-white/5 bg-white/[0.02] p-5"
      >
        <div className="h-3 w-24 rounded bg-white/5" />
        <div className="mt-4 flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[60px] flex-1 rounded-xl bg-white/[0.02]" />
          ))}
        </div>
      </motion.div>

      {/* Transactions skeleton */}
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="h-80 rounded-2xl border border-white/5 bg-white/[0.02]"
      />
    </div>
  );
}