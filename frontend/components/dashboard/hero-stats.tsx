"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, AlertTriangle, ArrowUpRight, Activity, Clock } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { fetchAccountBalances, HORIZON_MAINNET_URL, HORIZON_TESTNET_URL } from "@/lib/horizon";
import { normalizeNetworkName } from "@/lib/network";

// Maximum XLM value for 100% full gauge
const MAX_GAS_DISPLAY = 20;
const WARNING_THRESHOLD = 5;

interface StatsCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  accentColor?: string;
  glowColor?: string;
  extraElement?: React.ReactNode;
}

function StatsCard({
  title,
  value,
  subtext,
  icon,
  accentColor = "text-moon-accent",
  glowColor = "shadow-[0_0_15px_rgba(0,212,255,0.15)]",
  extraElement,
}: StatsCardProps) {
  return (
    <div
      className={`group relative rounded-xl border-[0.5px] border-moon-border/40 bg-moon-card/95 p-4 sm:p-6 backdrop-blur-md 
        transition-all duration-300 ease-out hover:-translate-y-1 hover:border-moon-border/70 
        hover:${glowColor} focus-within:ring-2 focus-within:ring-moon-accent/50 outline-none`}
      role="region"
      aria-label={`${title} statistic`}
      tabIndex={0}
    >
      <div className="flex flex-col h-full justify-between gap-2 sm:gap-4">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-semibold tracking-wider text-moon-text-secondary uppercase">
            {title}
          </h2>
          <div className={`p-2 rounded-lg bg-moon-bg/40 border border-white/5 ${accentColor}`}>
            {icon}
          </div>
        </div>

        {/* Content Row */}
        <div className="space-y-1">
          <p className="font-heading font-bold text-[20px] sm:text-[24px] text-moon-text-primary tracking-tight leading-none">
            {value}
          </p>
          <p className="text-[12px] text-moon-text-secondary flex items-center gap-1.5 font-medium">
            {extraElement}
            <span>{subtext}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeroStats() {
  const { address, isConnected, network } = useWallet();
  const [balance, setBalance] = useState<number>(14.85); // fallback default
  const [isLoading, setIsLoading] = useState(true);
  const [pulseTime, setPulseTime] = useState<string>("");

  // Simulated live updates for some statistics
  const [totalStreams, setTotalStreams] = useState(12);
  const [volume, setVolume] = useState(24500.80);

  // Fetch real XLM balance if connected
  const fetchBalance = useCallback(async () => {
    if (!address || !network) {
      setIsLoading(false);
      return;
    }
    try {
      const normalizedNetwork = normalizeNetworkName(network);
      const horizonUrl = normalizedNetwork === "mainnet" ? HORIZON_MAINNET_URL : HORIZON_TESTNET_URL;
      const balances = await fetchAccountBalances(address, horizonUrl);
      setBalance(parseFloat(balances.xlm));
    } catch (err) {
      console.error("Failed to fetch XLM balance in HeroStats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address, network]);

  useEffect(() => {
    fetchBalance();
    setIsLoading(false); // don't block display if not loading wallet
  }, [fetchBalance]);

  // Real-time animated pulse or clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setPulseTime(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate small transactions or updates for realism
  useEffect(() => {
    const interval = setInterval(() => {
      // Occasional small volume increment
      setVolume((v) => v + (Math.random() > 0.7 ? parseFloat((Math.random() * 5).toFixed(2)) : 0));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isLowBalance = balance < WARNING_THRESHOLD;
  const gasPercentage = Math.min((balance / MAX_GAS_DISPLAY) * 100, 100);

  // Circular progress math
  const radius = 18;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gasPercentage / 100) * circumference;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full">
      {/* 1. Total Streams Card */}
      <StatsCard
        title="Total Streams"
        value={totalStreams}
        subtext="8 streams active"
        accentColor="text-moon-accent"
        glowColor="shadow-[0_0_15px_rgba(0,212,255,0.2)]"
        icon={<Activity className="w-4 h-4" />}
        extraElement={
          <span className="relative flex h-2 w-2 mr-1">
            <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        }
      />

      {/* 2. Monthly Volume Card */}
      <StatsCard
        title="Monthly Volume"
        value={`$${volume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtext="+12.4% vs last month"
        accentColor="text-emerald-400"
        glowColor="shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        icon={<ArrowUpRight className="w-4 h-4" />}
        extraElement={<span className="text-emerald-400 font-bold mr-0.5">↑</span>}
      />

      {/* 3. Next Disbursement Card */}
      <StatsCard
        title="Next Disbursement"
        value="02h 14m"
        subtext={`Sync: ${pulseTime}`}
        accentColor="text-violet-400"
        glowColor="shadow-[0_0_15px_rgba(124,58,237,0.15)]"
        icon={<Clock className="w-4 h-4" />}
        extraElement={
          <span className="relative flex h-1.5 w-1.5 mr-1 bg-violet-400 rounded-full animate-pulse" />
        }
      />

      {/* 4. Gas Tank (XLM) Card */}
      <div
        className={`group relative rounded-xl border-[0.5px] border-moon-border/40 bg-moon-card/95 p-4 sm:p-6 backdrop-blur-md 
          transition-all duration-300 ease-out hover:-translate-y-1 hover:border-moon-border/70 
          ${isLowBalance ? "shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:border-red-500/50" : "shadow-[0_0_15px_rgba(0,212,255,0.15)] hover:border-moon-border/70"} 
          focus-within:ring-2 focus-within:ring-moon-accent/50 outline-none`}
        role="region"
        aria-label="Gas Tank Fuel Gauge"
        tabIndex={0}
      >
        <div className="flex flex-col h-full justify-between gap-2 sm:gap-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold tracking-wider text-moon-text-secondary uppercase">
              Gas Tank
            </h2>
            <div className={`p-2 rounded-lg bg-moon-bg/40 border border-white/5 ${isLowBalance ? "text-red-400" : "text-moon-accent"}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {/* Content Row with Circular Gauge */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-heading font-bold text-[20px] sm:text-[24px] text-moon-text-primary tracking-tight leading-none">
                {balance.toFixed(2)} <span className="text-sm font-semibold text-moon-text-secondary">XLM</span>
              </p>
              <p className="text-[12px] text-moon-text-secondary flex items-center gap-1 font-medium">
                {isLowBalance ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span className="text-red-400 font-bold">Low Fuel (Refill)</span>
                  </>
                ) : (
                  <span>Approx. 60 splits left</span>
                )}
              </p>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className="stroke-white/5 fill-none"
                  strokeWidth={strokeWidth}
                />
                {/* Animated progress circle */}
                <motion.circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className={`fill-none ${isLowBalance ? "stroke-red-500" : "stroke-moon-accent"}`}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  strokeLinecap="round"
                  style={{
                    filter: isLowBalance 
                      ? "drop-shadow(0 0 4px rgba(239,68,68,0.5))" 
                      : "drop-shadow(0 0 4px rgba(0,212,255,0.5))",
                  }}
                />
              </svg>
              {/* Central text showing % */}
              <div className={`absolute text-[9px] font-bold tracking-tighter ${isLowBalance ? "text-red-400" : "text-moon-accent"}`}>
                {Math.round(gasPercentage)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
