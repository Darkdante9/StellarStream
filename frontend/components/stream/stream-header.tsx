"use client";

import React from "react";
import { motion } from "framer-motion";
import { OrganizationAvatar } from "@/components/organization-avatar";
import { Badge } from "@/components/ui/Badge";
import type { StreamData } from "@/components/view-stream-client";

interface StreamHeaderProps {
  stream: StreamData;
}

/**
 * Stream Header — displays stream name, recipient info, and status badge
 * with moon-theme aesthetic using the Stellar Glass design system.
 */
export function StreamHeader({ stream }: StreamHeaderProps) {
  const isActive = stream.status === "active";
  const isPaused = stream.status === "paused";
  const isEnded = stream.status === "ended";

  const statusVariant = isActive ? "success" : isPaused ? "warning" : "error";
  const statusLabel = isActive ? "Active" : isPaused ? "Paused" : "Ended";

  const endTime = new Date(stream.endTime);
  const daysLeft = Math.ceil((endTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
    >
      {/* Nebula glow background */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#00f5ff]/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-36 w-36 rounded-full bg-[#8a00ff]/10 blur-[80px]" />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top row: Org avatar + name + status badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {stream.organization && (
              <OrganizationAvatar
                logoUrl={stream.organization.logo_url}
                stellarAddress={stream.organization.id}
                size={48}
                className="rounded-xl border border-white/20 shadow-[0_0_20px_rgba(0,245,255,0.15)]"
                altText={`${stream.organization.name} logo`}
              />
            )}
            <div>
              <h1 className="font-heading text-xl font-bold text-white md:text-2xl">
                {stream.name}
              </h1>
              {stream.organization && (
                <p className="font-body text-sm text-white/50">
                  {stream.organization.name}
                </p>
              )}
            </div>
          </div>

          <Badge
            variant={statusVariant}
            size="lg"
            dot
            className={`uppercase tracking-wider text-xs font-semibold ${
              isActive
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                : isPaused
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {statusLabel}
          </Badge>
        </div>

        {/* Recipient & Sender info row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <p className="font-body text-[10px] uppercase tracking-widest text-white/35">
              Sender
            </p>
            <p className="font-ticker truncate text-sm font-semibold text-white/80">
              {stream.sender}
            </p>
          </div>
          <div className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <p className="font-body text-[10px] uppercase tracking-widest text-white/35">
              Receiver
            </p>
            <p className="font-ticker truncate text-sm font-semibold text-white/80">
              {stream.receiver}
            </p>
          </div>
        </div>

        {/* Time remaining row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`
              : "Stream ended"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Token: {stream.token}
          </span>
          <span>
            TX_REF:{" "}
            <span className="font-ticker text-[#00f5ff]/50">
              {stream.id.slice(0, 12)}...
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}