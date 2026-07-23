"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Gas Tank Component
 * Issue #428 - "Gas Tank" (XLM Balance) Indicator
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * A persistent sidebar element that monitors the user's native XLM balance.
 * Shows a "Fuel Gauge" and warns when balance < 5 XLM with a refill link.
 * 
 * Features:
 * - Real-time XLM balance display
 * - Visual fuel gauge with animated liquid
 * - "Cosmic Red" warning state when balance < 5 XLM
 * - Refill links to LOBSTR/Binance swap pages
 * - Splits Remaining Calculator: Shows "Approx. X splits remaining" based on
 *   current balance and average split cost (balance / average_split_cost)
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Wallet, AlertTriangle, X, Sparkles } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useSplitsRemaining } from "@/lib/use-splits-remaining";
import { useInterval } from "@/lib/hooks/use-interval";
import { usePageVisibility } from "@/lib/hooks/use-page-visibility";
import { fetchAccountBalances, HORIZON_MAINNET_URL, HORIZON_TESTNET_URL } from "@/lib/horizon";
import { normalizeNetworkName } from "@/lib/network";
import { GasTankAdvisor } from "./dashboard/GasTankAdvisor";
import { useGasBuffer } from "@/lib/use-gas-buffer";
import { GasTankRefillWizard } from "./gas-tank-refill-wizard";

// Refill links for different exchanges
const REFILL_LINKS = {
  lobstr: "https://lobstr.co/swap",
  binance: "https://www.binance.com/en/trade/XLM_USDT",
  stellarX: "https://stellarswap.io",
};

interface GasTankProps {
  maxDisplay?: number;
  warningThreshold?: number;
  position?: "sidebar" | "floating";
}

export default function GasTank({
  maxDisplay = 20,
  // low gas color threshold per acceptance criteria
  warningThreshold = 0.5,
  position = "sidebar",
}: GasTankProps) {
  const { address, isConnected, network } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const { status: bufferStatus, pendingOp: bufferPending } = useGasBuffer();
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  
  // Page visibility for pausing polling
  const isPageVisible = usePageVisibility();
  
  // Get splits remaining calculation
  const { approximateSplits, isLoading: splitsLoading } = useSplitsRemaining(balance);

  // Fetch XLM balance
  const fetchBalance = useCallback(async () => {
    if (!address || !network) {
      setBalance(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const normalizedNetwork = normalizeNetworkName(network);
      const horizonUrl = normalizedNetwork === "mainnet" ? HORIZON_MAINNET_URL : HORIZON_TESTNET_URL;
      
      const balances = await fetchAccountBalances(address, horizonUrl);
      const xlmBalance = parseFloat(balances.xlm);
      
      // Check if balance changed for pulse animation
      if (previousBalance !== xlmBalance && previousBalance !== 0) {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 1000); // Pulse for 1 second
      }
      
      setPreviousBalance(xlmBalance);
      setBalance(xlmBalance);
    } catch (err) {
      console.error("Failed to fetch XLM balance:", err);
      setError("Failed to fetch balance");
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, network, previousBalance]);

  // Fetch balance on mount and when address/network changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Poll balance every 30 seconds, but only when page is visible
  useInterval(fetchBalance, isPageVisible ? 30000 : null);

  const isLowBalance = balance < warningThreshold;
  const fillPercent = Math.min((balance / maxDisplay) * 100, 100);

  // derive seconds remaining from gas buffer status (if available)
  useEffect(() => {
    if (bufferStatus && typeof bufferStatus.daysRemaining === "number" && bufferStatus.daysRemaining !== null) {
      setSecondsRemaining(Math.max(0, Math.floor(bufferStatus.daysRemaining * 24 * 3600)));
    } else {
      setSecondsRemaining(null);
    }
  }, [bufferStatus]);

  // countdown tick for real-time update
  useEffect(() => {
    if (secondsRemaining === null) return;
    const id = setInterval(() => {
      setSecondsRemaining((s) => (s && s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsRemaining]);

  const formatCountdown = (secs: number | null) => {
    if (secs === null) return "--";
    if (secs <= 0) return "0s";
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

        .gas-tank-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          font-family: 'Outfit', sans-serif;
        }

        .gas-tank-header {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .gas-tank-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .gas-tank-icon.normal {
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(0, 229, 255, 0.1));
          border: 1px solid rgba(0, 229, 255, 0.3);
        }

        .gas-tank-icon.low {
          background: linear-gradient(135deg, rgba(255, 107, 43, 0.2), rgba(255, 107, 43, 0.1));
          border: 1px solid rgba(255, 107, 43, 0.3);
          animation: pulse-warning 2s ease-in-out infinite;
        }

        @keyframes pulse-warning {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 43, 0.2); }
          50% { box-shadow: 0 0 20px rgba(255, 107, 43, 0.4); }
        }

        .gas-tank-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Circular Gauge */
        .circular-gauge {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 120px;
          height: 120px;
          cursor: pointer;
        }

        .gauge-svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .gauge-center {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          pointer-events: none;
        }

        .countdown {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
        }

        .gauge-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.45);
          color: white;
          font-size: 12px;
          border-radius: 12px;
        }

        /* Responsive: scale down for mobile */
        @media (max-width: 480px) {
          .circular-gauge { width: 88px; height: 88px; }
          .gauge-center .balance-value { font-size: 16px; }
        }

        /* Balance Display */
        .balance-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .balance-value {
          font-family: 'Space Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          transition: color 0.3s ease;
        }

        .balance-value.pulse {
          animation: balance-pulse 1s ease-in-out;
        }

        @keyframes balance-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        .balance-value.normal {
          color: #00e5ff;
        }

        .balance-value.low {
          color: #ff6b2b;
        }

        .balance-unit {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.05em;
        }

        /* Splits Remaining Indicator */
        .splits-remaining {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.08), rgba(0, 160, 200, 0.05));
          border: 1px solid rgba(0, 229, 255, 0.15);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #00e5ff;
          width: 100%;
          text-align: center;
        }

        .splits-remaining-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.05em;
        }

        .splits-remaining-value {
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          color: #00e5ff;
        }

        /* Warning Badge */
        .warning-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .warning-badge {
          background: rgba(255, 107, 43, 0.1);
          border: 1px solid rgba(255, 107, 43, 0.3);
          color: #ff6b2b;
        }

        .warning-badge:hover {
          background: rgba(255, 107, 43, 0.2);
          transform: scale(1.02);
        }

        /* Refill Modal */
        .refill-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
          .refill-modal-overlay {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
        }

        .refill-modal {
          background: rgba(10, 10, 20, 0.95);
          border: 1px solid rgba(255, 107, 43, 0.3);
          border-radius: 20px;
          padding: 24px;
          max-width: 360px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #ff6b2b;
        }

        .modal-close {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.5);
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .refill-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
        }

        .refill-option:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 107, 43, 0.3);
          transform: translateY(-2px);
        }

        .refill-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(255, 107, 43, 0.2), rgba(255, 107, 43, 0.1));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .refill-info {
          flex: 1;
        }

        .refill-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .refill-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .refill-arrow {
          color: rgba(255, 255, 255, 0.3);
        }

        .modal-warning {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          background: rgba(255, 107, 43, 0.05);
          border: 1px solid rgba(255, 107, 43, 0.15);
          border-radius: 10px;
          margin-top: 8px;
        }

        .modal-warning-icon {
          color: #ff6b2b;
          flex-shrink: 0;
        }

        .modal-warning-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.5;
        }
      `}</style>

      <div className="gas-tank-container">
        {/* Header */}
        <div className="gas-tank-header">
          <div className={`gas-tank-icon ${isLowBalance ? "low" : "normal"}`}>
            <Wallet className={`w-5 h-5 ${isLowBalance ? "text-[#ff6b2b]" : "text-[#00e5ff]"}`} />
          </div>
          <span className="gas-tank-title">Gas Tank</span>
          <button 
            onClick={() => setShowAdvisor(true)}
            className="ml-auto p-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400/60 hover:text-cyan-400 hover:bg-white/10 transition-all"
            title="Gas Tank Advisor"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Circular Gauge */}
        <div
          className="circular-gauge"
          role="img"
          aria-label={`Gas tank: ${isLoading ? 'loading' : balance.toFixed(2)} XLM`}
          title="Gas Tank: shows XLM available for Soroban fees. Click to refill."
        >
          <svg viewBox="0 0 120 120" width="120" height="120" className="gauge-svg" aria-hidden="true">
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="48" strokeWidth="12" stroke={"#232a34"} fill="none" />
            <motion.circle
              cx="60"
              cy="60"
              r={48}
              strokeWidth={12}
              strokeLinecap="round"
              stroke={isLowBalance ? "#f59e0b" : "#00d4ff"}
              fill="none"
              style={{ filter: "url(#glow)" }}
              initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 48 * (1 - fillPercent / 100),
              }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              strokeDasharray={2 * Math.PI * 48}
            />
          </svg>
          <div className="gauge-center">
            <div className={`balance-value ${isLowBalance ? "low" : "normal"} ${isPulsing ? "pulse" : ""}`}>
              {isLoading ? "..." : balance.toFixed(2)}
            </div>
            <div className="balance-unit">XLM</div>
            <div className="countdown">{formatCountdown(secondsRemaining)} remaining</div>
            <div className="countdown">{bufferStatus ? `${bufferStatus.burnRatePerDayXlm.toFixed(3)} XLM/day` : "--"}</div>
          </div>
          {bufferPending === "deposit" && (
            <div className="gauge-loading">Processing transaction...</div>
          )}
          <span aria-live="polite" style={{position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden'}}>Balance {isLoading ? 'loading' : `${balance.toFixed(2)} XLM`}</span>
        </div>

        {/* Balance Display */}
        <div className="balance-display">
          <span className={`balance-value ${isLowBalance ? "low" : "normal"} ${isPulsing ? "pulse" : ""}`}>
            {isLoading ? "..." : balance.toFixed(2)}
          </span>
          <span className="balance-unit">XLM</span>
        </div>

        {/* Splits Remaining Indicator */}
        <div className="splits-remaining">
          <span className="splits-remaining-label">Approx.</span>
          <span className="splits-remaining-value">
            {splitsLoading ? "..." : approximateSplits}
          </span>
          <span className="splits-remaining-label">splits</span>
        </div>

        {/* Warning Badge - Cosmic Red */}
        <AnimatePresence>
          {isLowBalance && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="warning-badge"
              onClick={() => setShowRefillModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setShowRefillModal(true);
                }
              }}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Low Balance</span>
              <ExternalLink className="w-3 h-3" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Refill wizard component (separate file) */}
      <GasTankRefillWizard isOpen={showRefillModal} onClose={() => setShowRefillModal(false)} />

      <GasTankAdvisor 
        isOpen={showAdvisor}
        onClose={() => setShowAdvisor(false)}
        currentBalanceXlm={balance}
        onApplySuggestion={(amount) => {
          // In a real app, this would open the refill modal with the amount pre-filled
          // or trigger a deposit transaction. For now, we'll just show the refill modal.
          setShowRefillModal(true);
        }}
      />
    </>
  );
}