"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";

interface StreamErrorProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Stream Error — error state for stream detail page with retry button.
 * Shows error message and action to retry loading.
 */
export function StreamError({
  message = "Failed to load stream data. Please try again.",
  onRetry,
}: StreamErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-6 p-8 pt-20 text-center"
    >
      {/* Error icon */}
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
      </div>

      {/* Error content */}
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-bold text-white">
          Something went wrong
        </h2>
        <p className="font-body text-sm leading-relaxed text-white/50">
          {message}
        </p>
      </div>

      {/* Retry button */}
      {onRetry && (
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 rounded-xl border border-[#00f5ff]/30 bg-[#00f5ff]/10 px-6 py-3 font-body text-sm font-medium text-[#00f5ff] transition-all hover:bg-[#00f5ff]/20 hover:shadow-[0_0_20px_rgba(0,245,255,0.15)]"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </motion.button>
      )}

      {/* Navigation hint */}
      <p className="font-body text-xs text-white/20">
        If this persists, please check your connection and try again.
      </p>
    </motion.div>
  );
}