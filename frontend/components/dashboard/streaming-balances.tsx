"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useAssetDecimals } from "@/lib/use-asset-decimals";
import { useAssetPrice } from "@/lib/use-asset-price";
import { Coins, Eye, EyeOff } from "lucide-react";

const DIGIT_HEIGHT = 40;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type Token =
  | { type: "digit"; value: number }
  | { type: "static"; value: string };

function DigitRoller({ digit }: { digit: number }) {
  const spring = useSpring(digit, { stiffness: 180, damping: 22, mass: 0.6 });

  useEffect(() => {
    spring.set(digit);
  }, [digit, spring]);

  const y = useTransform(spring, (v) => -v * DIGIT_HEIGHT);

  return (
    <div
      style={{
        position: "relative",
        height: `${DIGIT_HEIGHT}px`,
        width: "0.62em",
        overflow: "hidden",
        display: "inline-block",
      }}
      aria-hidden="true"
    >
      <motion.div style={{ y, willChange: "transform" }}>
        {DIGITS.map((d) => (
          <div
            key={d}
            style={{
              height: `${DIGIT_HEIGHT}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {d}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function StaticChar({ char }: { char: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: `${DIGIT_HEIGHT}px`,
        paddingBottom: "2px",
      }}
      aria-hidden="true"
    >
      {char}
    </span>
  );
}

interface OdometerProps {
  value: number;
  prefix?: string;
  decimals?: number;
  color?: string;
}

export function Odometer({
  value,
  prefix = "$",
  decimals = 2,
  color = "text-moon-accent",
}: OdometerProps) {
  const tokens = useMemo<Token[]>(() => {
    const num = isNaN(value) ? 0 : value;
    const [intPart, decPart = ""] = num.toFixed(decimals).split(".");
    const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const result: Token[] = [];
    for (const ch of prefix) result.push({ type: "static", value: ch });
    for (const ch of intWithCommas) {
      result.push(
        /\d/.test(ch)
          ? { type: "digit", value: parseInt(ch, 10) }
          : { type: "static", value: ch },
      );
    }
    result.push({ type: "static", value: "." });
    for (const ch of decPart) {
      result.push({ type: "digit", value: parseInt(ch, 10) });
    }
    return result;
  }, [value, prefix, decimals]);

  // Construct screen-reader friendly value
  const readableText = `${prefix}${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  return (
    <div
      className={`inline-flex items-center font-mono font-bold text-[32px] md:text-[40px] leading-none tracking-tight selection:bg-moon-accent/20 ${color}`}
      style={{ userSelect: "none" }}
      aria-label={readableText}
    >
      {tokens.map((t, i) =>
        t.type === "digit" ? (
          <DigitRoller key={i} digit={t.value} />
        ) : (
          <StaticChar key={i} char={t.value} />
        ),
      )}
    </div>
  );
}

export interface StreamingBalancesProps {
  initialValue?: number;
  rate?: number; // per ms
  prefix?: string;
  decimals?: number;
  color?: string;
  assetCode?: string;
  assetIssuer?: string;
}

export function StreamingBalances({
  initialValue = 48291.3847291,
  rate = 0.0000247, // rate of flow per millisecond
  prefix = "$",
  decimals: decimalsProp,
  color = "text-moon-accent",
  assetCode = "USDC",
  assetIssuer,
}: StreamingBalancesProps) {
  // Fetch decimals from Stellar Horizon when asset info is provided
  const { decimals: fetchedDecimals } = useAssetDecimals(assetCode, assetIssuer);
  const decimals = decimalsProp ?? fetchedDecimals ?? 7;

  const [balance, setBalance] = useState(initialValue);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number | null>(null);

  // Set up second-by-second increment loop via RequestAnimationFrame
  useEffect(() => {
    setBalance(initialValue);
    lastRef.current = null;

    const tick = (ts: number) => {
      if (lastRef.current !== null) {
        const delta = ts - lastRef.current;
        setBalance((b) => b + rate * delta);
      }
      lastRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [rate, initialValue]);

  const { price, justUpdated, isLoading: isPriceLoading } = useAssetPrice(assetCode || "XLM");
  const [view, setView] = useState<"native" | "usd">("usd");

  const displayValue = view === "usd" && price !== null ? balance * price : balance;
  const displayPrefix = view === "usd" ? "$" : "";
  const displayDecimals = view === "usd" ? 2 : decimals;
  const displayAssetCode = view === "native" ? assetCode : "USD";

  return (
    <div
      className="relative flex flex-col items-center justify-between p-8 md:p-10 rounded-2xl border-[0.5px] border-moon-border/40 bg-moon-card/95 backdrop-blur-md shadow-[0_0_25px_rgba(124,58,237,0.1)] hover:border-moon-border/70 hover:shadow-[0_0_35px_rgba(124,58,237,0.2)] transition-all duration-300 w-full"
      role="region"
      aria-label="Real-time Streaming Balance Tracker"
    >
      {/* Decorative corners for cyber/stellar look */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-moon-accent/40 rounded-tl" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-moon-accent/40 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-moon-accent/40 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-moon-accent/40 rounded-br" />

      {/* Title */}
      <div className="w-full flex items-center justify-between mb-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-moon-accent animate-pulse" />
          <span className="text-[12px] font-bold tracking-wider text-moon-text-secondary uppercase">
            Live Streaming Balance
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-moon-accent/10 border border-moon-accent/20 text-[10px] font-bold text-moon-accent">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-moon-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-moon-accent" />
          </span>
          Live
        </div>
      </div>

      {/* Main Odometer Display */}
      <div className="relative my-6 py-2">
        <Odometer
          value={displayValue}
          prefix={displayPrefix}
          decimals={displayDecimals}
          color={view === "usd" ? "text-moon-text-primary" : "text-moon-accent"}
        />

        {/* Pulse Indicator from Price Feed */}
        <AnimatePresence>
          {justUpdated && view === "usd" && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 2, 1], opacity: [0, 0.8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: 1 }}
              className="absolute -top-2 -right-4 w-3.5 h-3.5 rounded-full bg-moon-accent shadow-[0_0_12px_#00d4ff]"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info / Interactivity */}
      <div className="w-full flex items-center justify-between pt-4 border-t border-white/5 text-[11px] font-semibold text-moon-text-secondary">
        <div className="flex items-center gap-2">
          <span className="text-moon-accent font-bold tracking-widest uppercase">
            {displayAssetCode}
          </span>
          {isPriceLoading && view === "usd" && (
            <span className="text-[10px] text-moon-text-secondary/50 animate-pulse">
              Oracle sync...
            </span>
          )}
        </div>

        <button
          onClick={() => setView((v) => (v === "native" ? "usd" : "native"))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-moon-bg hover:bg-white/5 border border-white/10 hover:text-moon-text-primary transition-all duration-200"
          aria-label={`Switch view to ${view === "usd" ? "Native Asset" : "USD"}`}
        >
          {view === "usd" ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show {assetCode}</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Show USD</span>
            </>
          )}
        </button>
      </div>

      {/* Floating toast-like overlay for update feedback */}
      <AnimatePresence>
        {justUpdated && view === "usd" && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 px-2.5 py-1 rounded-md bg-moon-accent/20 border border-moon-accent/30 text-[9px] font-bold text-moon-accent tracking-widest uppercase"
          >
            Oracle Price Updated
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default StreamingBalances;
