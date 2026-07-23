"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { StreamData } from "@/components/view-stream-client";

interface ProgressBarProps {
  stream: StreamData;
}

/**
 * Progress Bar — animated progress bar showing stream completion percentage.
 * Color changes: green → yellow → red as the stream progresses.
 * Displays days/weeks remaining.
 */
export function ProgressBar({ stream }: ProgressBarProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const percentComplete = (stream.streamed / stream.totalAmount) * 100;
  const endTime = new Date(stream.endTime);
  const startTime = new Date(stream.startTime);
  const now = Date.now();
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsed = now - startTime.getTime();
  const timeRemainingPct = totalDuration > 0 ? ((totalDuration - elapsed) / totalDuration) * 100 : 0;
  const daysLeft = Math.ceil((endTime.getTime() - now) / (1000 * 60 * 60 * 24));
  const weeksLeft = Math.ceil(daysLeft / 7);

  // Color logic based on TIME REMAINING (green > 50%, yellow 20-50%, red < 20%)
  const getProgressColor = (timeRemainingPct: number) => {
    if (timeRemainingPct > 50) return "#34d399"; // green — more than half time left
    if (timeRemainingPct > 20) return "#fbbf24"; // yellow/amber — between 20-50% time left
    return "#f87171"; // red — less than 20% time left
  };

  const progressColor = getProgressColor(timeRemainingPct);

  // Time remaining display
  const timeRemaining =
    daysLeft > 0
      ? weeksLeft > 1
        ? `${weeksLeft} week${weeksLeft > 1 ? "s" : ""}`
        : `${daysLeft} day${daysLeft > 1 ? "s" : ""}`
      : "Less than a day";

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercent(percentComplete), 200);
    return () => clearTimeout(timer);
  }, [percentComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
    >
      {/* Labels */}
      <div className="mb-3 flex items-center justify-between">
        <p className="font-body text-[10px] uppercase tracking-widest text-white/35">
          Progress
        </p>
        <p className="font-ticker text-[11px] text-white/30">
          {stream.totalAmount.toLocaleString()} {stream.token} total
        </p>
      </div>

      {/* Progress bar with time-remaining label ON the bar */}
      <div className="relative mb-3 h-8 w-full">
        {/* Background track */}
        <div className="absolute inset-0 overflow-hidden rounded-full bg-white/5">
          {/* Filled portion */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${animatedPercent}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${progressColor}, ${progressColor}88)`,
              boxShadow: `0 0 12px ${progressColor}44`,
            }}
          />
          {/* Glow overlay */}
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${progressColor} 50%, transparent 100%)`,
              filter: "blur(4px)",
            }}
          />
        </div>
        {/* Time remaining label ON the bar */}
        {stream.status === "active" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-body text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: animatedPercent > 40 ? "#0a0a14" : "rgba(255,255,255,0.7)",
                textShadow: animatedPercent > 40 ? "none" : "0 0 4px rgba(0,0,0,0.5)",
              }}
            >
              {timeRemaining} left
            </span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-ticker text-lg font-bold text-white">
            {percentComplete.toFixed(1)}%
          </span>
          <span className="font-body text-[10px] text-white/30">complete</span>
        </div>
        <div className="text-right">
          <p className="font-ticker text-sm font-semibold text-white/70">
            {stream.streamed.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {stream.token}
          </p>
          <p className="font-body text-[10px] text-white/25">
            streamed of {stream.totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Time remaining */}
      <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
        <svg
          className="h-3.5 w-3.5 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-body text-xs text-white/40">
          {stream.status === "active"
            ? `${timeRemaining} remaining`
            : stream.status === "paused"
              ? "Stream paused"
              : "Stream ended"}
        </span>
      </div>
    </motion.div>
  );
}