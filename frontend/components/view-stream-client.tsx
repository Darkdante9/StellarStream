"use client";

/**
 * Client-only interactive parts of the public stream preview page.
 * Complete redesign with moon theme, enhanced data visualization, and action buttons.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import io, { type Socket } from "socket.io-client";
import { StreamHeader } from "@/components/stream/stream-header";
import { FlowRateGauge } from "@/components/stream/flow-rate-gauge";
import { ProgressBar } from "@/components/stream/progress-bar";
import { BalanceProjectionChart } from "@/components/stream/balance-projection-chart";
import { TransactionHistory } from "@/components/stream/transaction-history";
import { ActionButtons } from "@/components/stream/action-buttons";
import { StreamSkeleton } from "@/components/stream/stream-skeleton";
import { StreamError } from "@/components/stream/stream-error";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface StreamData {
  id: string;
  name: string;
  token: string;
  status: "active" | "paused" | "ended";
  totalAmount: number;
  streamed: number;
  ratePerSecond: number;
  sender: string;
  receiver: string;
  startTime: string; // ISO string — serialisable across server→client boundary
  endTime: string;
  apy?: number;
  organization?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

// ─── Live counter ─────────────────────────────────────────────────────────

function LiveCounter({ base, rate }: { base: number; rate: number }) {
  const [val, setVal] = useState(base);

  useEffect(() => {
    if (rate === 0) return;
    const id = setInterval(() => setVal((v) => v + rate * 0.1), 100);
    return () => clearInterval(id);
  }, [rate]);

  return (
    <>
      {val.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </>
  );
}

// ─── Main client shell ─────────────────────────────────────────────────────

export function ViewStreamClient({ stream }: { stream: StreamData }) {
  const [liveStream, setLiveStream] = useState<StreamData>(stream);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const isActive = liveStream.status === "active";

  // ─── WebSocket connection for real-time updates ─────────────────────────
  useEffect(() => {
    // Connect to WebSocket for real-time stream updates
    try {
      const socket = io(WS_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        console.log("[WS] Connected to stream updates");
        socket.emit("subscribe:stream", liveStream.id);
      });

      socket.on("stream:update", (data: Partial<StreamData>) => {
        setLiveStream((prev) => ({
          ...prev,
          ...data,
        }));
      });

      socket.on("stream:status", (status: StreamData["status"]) => {
        setLiveStream((prev) => ({ ...prev, status }));
      });

      socket.on("disconnect", () => {
        console.log("[WS] Disconnected from stream updates");
      });

      socket.on("connect_error", (err) => {
        console.warn("[WS] Connection error (non-critical):", err.message);
      });

      socketRef.current = socket;

      return () => {
        socket.emit("unsubscribe:stream", liveStream.id);
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (err) {
      // WebSocket is optional — fall back to polling if unavailable
      console.warn("[WS] Failed to connect (using fallback):", err);
    }
  }, [liveStream.id]);

  // ─── Retry handler ──────────────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stream/${liveStream.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLiveStream((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stream data",
      );
    } finally {
      setLoading(false);
    }
  }, [liveStream.id]);

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return <StreamSkeleton />;
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return <StreamError message={error} onRetry={handleRetry} />;
  }

  const percentComplete = (liveStream.streamed / liveStream.totalAmount) * 100;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-5"
      >
        {/* ────────── Header Card ────────── */}
        <StreamHeader stream={liveStream} />

        {/* ────────── Live Counter ────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
          role="status"
          aria-live="polite"
          aria-label={`Total streamed: ${liveStream.streamed.toFixed(2)} ${liveStream.token}`}
        >
          <p className="font-body text-[10px] uppercase tracking-widest text-white/35">
            Total Streamed
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-ticker text-5xl font-bold text-[#00f5ff]">
              <LiveCounter
                base={liveStream.streamed}
                rate={isActive ? liveStream.ratePerSecond : 0}
              />
            </span>
            <span className="font-body text-lg text-[#00f5ff]/60">
              {liveStream.token}
            </span>
          </div>
          {isActive && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-white/50">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span aria-label={`${liveStream.ratePerSecond.toFixed(5)} ${liveStream.token} per second`}>
                +{liveStream.ratePerSecond.toFixed(5)} {liveStream.token}/sec
              </span>
            </div>
          )}
        </motion.div>

        {/* ────────── Data Visualizations Row ────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ProgressBar stream={liveStream} />
          <FlowRateGauge stream={liveStream} />
        </div>

        {/* ────────── Balance Projection Chart ────────── */}
        <BalanceProjectionChart stream={liveStream} />

        {/* ────────── Action Buttons ────────── */}
        <ActionButtons stream={liveStream} />

        {/* ────────── Transaction History ────────── */}
        <TransactionHistory
          streamId={liveStream.id}
          token={liveStream.token}
        />

        {/* ────────── Powered by Footer ────────── */}
        <p className="py-6 text-center font-body text-xs text-white/20">
          Powered by{" "}
          <a
            href="https://stellarstream.app"
            className="text-[#00f5ff]/60 transition-colors hover:text-[#00f5ff]"
          >
            StellarStream
          </a>
        </p>
      </motion.div>
    </div>
  );
}