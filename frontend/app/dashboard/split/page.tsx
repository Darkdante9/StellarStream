"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowRightLeft,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import SplitCard, { type SplitCardData } from "@/components/split/split-card";
import SplitChart from "@/components/split/split-chart";
import SplitWizard from "@/components/split/split-wizard";
import { useSplitFeed } from "@/lib/hooks/use-split-feed";
import { computeSplitDiff, type SplitDiffRow } from "@/lib/split-diff";
import { SplitLiveTicker } from "@/components/split-live-ticker";

const STORAGE_KEY = "stellarstream_splits";

function loadSplits(): SplitCardData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw, (key, value) => {
      if (key === "createdAt") return new Date(value);
      return value;
    });
  } catch {
    return [];
  }
}

function saveSplits(splits: SplitCardData[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(splits));
} catch (_error) {
    // Silently fail if localStorage is not available
  }
}

function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 14);
}

export default function SplitPage() {
  const [splits, setSplits] = useState<SplitCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<SplitCardData | undefined>(undefined);
  const [showComparison, setShowComparison] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [showFeed, setShowFeed] = useState(false);

  const { events } = useSplitFeed();

  useEffect(() => {
    setSplits(loadSplits());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) saveSplits(splits);
  }, [splits, loading]);

  // Real-time: smoothly update matched splits from feed events
  useEffect(() => {
    if (events.length === 0 || splits.length === 0) return;
    const latest = events[0];
    if (!latest) return;
    setSplits((prev) =>
      prev.map((s) => {
        if (s.status !== "active") return s;
        const matchKey = s.recipients
          .slice(0, 3)
          .map((r) => r.address.slice(0, 8))
          .join(",");
        if (latest.sender.includes(matchKey.slice(0, 4))) {
          return {
            ...s,
            totalAmount: (
              parseFloat(s.totalAmount) + parseFloat(latest.amount) * 0.01
            ).toFixed(2),
          };
        }
        return s;
      })
    );
  }, [events, splits.length]);

  const selectedSplit = useMemo(
    () => splits.find((s) => s.id === selectedId) ?? null,
    [splits, selectedId]
  );

  const handleCreate = useCallback(() => {
    setEditingSplit(undefined);
    setWizardOpen(true);
  }, []);

  const handleEdit = useCallback((split: SplitCardData) => {
    setEditingSplit(split);
    setWizardOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSplits((prev) => prev.filter((s) => s.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const handleWizardConfirm = useCallback(
    (data: { name: string; recipients: { id: string; address: string; label: string; share: number }[]; totalAmount: string; asset: string }) => {
      const now = new Date();
      if (editingSplit) {
        setSplits((prev) =>
          prev.map((s) =>
            s.id === editingSplit.id
              ? {
                  ...s,
                  name: data.name,
                  recipients: data.recipients.map((r) => ({
                    id: r.id,
                    address: r.address,
                    amount: "0",
                    share: r.share,
                    label: r.label || undefined,
                  })),
                  totalAmount: data.totalAmount,
                  asset: data.asset,
                }
              : s
          )
        );
      } else {
        const newSplit: SplitCardData = {
          id: generateId(),
          name: data.name,
          recipients: data.recipients.map((r) => ({
            id: r.id,
            address: r.address,
            amount: "0",
            share: r.share,
            label: r.label || undefined,
          })),
          createdAt: now,
          totalAmount: data.totalAmount,
          asset: data.asset,
          status: "active",
        };
        setSplits((prev) => [newSplit, ...prev]);
      }
    },
    [editingSplit]
  );

  // Comparison tool
  const comparisonSplits = useMemo(() => {
    if (!compareA || !compareB) return null;
    const a = splits.find((s) => s.id === compareA);
    const b = splits.find((s) => s.id === compareB);
    if (!a || !b) return null;
    return { a, b };
  }, [splits, compareA, compareB]);

  const diffRows = useMemo(() => {
    if (!comparisonSplits) return null;
    const baseRows = comparisonSplits.a.recipients.map((r, _i) => ({
      id: r.id,
      address: r.address,
      amount: r.share.toString(),
      memoType: "none" as const,
      memo: "",
    }));
    const currRows = comparisonSplits.b.recipients.map((r, _i) => ({
      id: r.id,
      address: r.address,
      amount: r.share.toString(),
      memoType: "none" as const,
      memo: "",
    }));
    return computeSplitDiff(baseRows, currRows);
  }, [comparisonSplits]);

  const getStatusBadge = (status: SplitDiffRow["status"]) => {
    const map = {
      New: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
      Removed: "bg-red-400/10 text-red-400 border-red-400/20",
      Changed: "bg-amber-400/10 text-amber-400 border-amber-400/20",
      Unchanged: "bg-white/5 text-white/40 border-white/10",
    };
    return (
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${map[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex-1 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
            Split Management
          </h1>
          <p className="mt-1 font-body text-sm text-white/50">
            Create and manage payment splits with real-time distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFeed(!showFeed)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
              showFeed
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-400"
                : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            <Activity className="h-4 w-4" />
            Live Feed
            {showFeed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white/60 hover:bg-white/5 transition-all"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Compare
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-black hover:bg-cyan-300 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Split
          </button>
        </div>
      </div>

      {/* Live Feed Panel */}
      <AnimatePresence>
        {showFeed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <SplitLiveTicker />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      ) : splits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-24 text-center">
          <Layers className="mb-4 h-16 w-16 text-white/10" />
          <h3 className="text-lg font-bold text-white/60">No splits yet</h3>
          <p className="mt-1 text-sm text-white/30">
            Create your first split to start distributing payments.
          </p>
          <button
            onClick={handleCreate}
            className="mt-6 flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-cyan-300 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Split
          </button>
        </div>
      ) : (
        <>
          {/* Split Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {splits.map((split) => (
                <SplitCard
                  key={split.id}
                  split={split}
                  selected={split.id === selectedId}
                  onSelect={() => setSelectedId(split.id === selectedId ? null : split.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Selected Split Detail */}
          <AnimatePresence>
            {selectedSplit && (
              <motion.div
                key={selectedSplit.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.3 }}
                className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedSplit.name}</h2>
                    <p className="text-xs text-white/40">
                      {selectedSplit.recipients.length} recipients &middot; {selectedSplit.totalAmount}{" "}
                      {selectedSplit.asset} &middot; {selectedSplit.status}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="rounded-lg p-1.5 text-white/30 hover:text-white transition-colors"
                    aria-label="Close detail"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <SplitChart recipients={selectedSplit.recipients} animated />

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                      Recipients
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {selectedSplit.recipients.map((r, i) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-white/20 font-mono w-4">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-mono text-white/80 truncate">
                                {r.label || `${r.address.slice(0, 8)}...`}
                              </p>
                              <p className="text-[10px] font-mono text-white/30 truncate">
                                {r.address}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-sm font-bold text-cyan-400">
                            {r.share.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comparison Tool */}
          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
                      Split Comparison
                    </h3>
                    <button
                      onClick={() => setShowComparison(false)}
                      className="text-xs text-white/30 hover:text-white transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-white/40">
                        Split A (Baseline)
                      </label>
                      <select
                        value={compareA ?? ""}
                        onChange={(e) => setCompareA(e.target.value || null)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                      >
                        <option value="">Select split...</option>
                        {splits.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.recipients.length} recipients)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-white/40">
                        Split B (Current)
                      </label>
                      <select
                        value={compareB ?? ""}
                        onChange={(e) => setCompareB(e.target.value || null)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                      >
                        <option value="">Select split...</option>
                        {splits.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.recipients.length} recipients)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {comparisonSplits && diffRows && (
                    <div>
                      <div className="mb-4 flex flex-wrap gap-4 text-xs">
                        <span className="flex items-center gap-1 text-white/60">
                          Baseline: <span className="font-bold text-white">{comparisonSplits.a.name}</span>
                        </span>
                        <span className="flex items-center gap-1 text-white/60">
                          Current: <span className="font-bold text-white">{comparisonSplits.b.name}</span>
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          New: {diffRows.filter((d) => d.status === "New").length}
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          Removed: {diffRows.filter((d) => d.status === "Removed").length}
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          Changed: {diffRows.filter((d) => d.status === "Changed").length}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03]">
                              <th className="px-4 py-3 font-medium text-white/40 text-xs">Status</th>
                              <th className="px-4 py-3 font-medium text-white/40 text-xs">Address</th>
                              <th className="px-4 py-3 font-medium text-white/40 text-xs text-right">A %</th>
                              <th className="px-4 py-3 font-medium text-white/40 text-xs text-right">B %</th>
                              <th className="px-4 py-3 font-medium text-white/40 text-xs text-right">Delta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {diffRows.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-xs text-white/40">
                                  No recipients in either split.
                                </td>
                              </tr>
                            )}
                            {diffRows.map((row) => (
                              <tr
                                key={row.address}
                                className={`transition-colors hover:bg-white/[0.02] ${
                                  row.status === "Removed"
                                    ? "bg-red-950/20"
                                    : row.status === "New"
                                      ? "bg-emerald-950/20"
                                      : ""
                                }`}
                              >
                                <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                                <td className="px-4 py-3 font-mono text-xs text-white/70 truncate max-w-[200px]">
                                  {row.address}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-white/60">
                                  {row.baseAmount ?? "—"}%
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-white">
                                  {row.currAmount ?? "—"}%
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.deltaAmount === null || row.deltaAmount === 0 ? (
                                    <span className="text-white/20 text-xs">—</span>
                                  ) : row.deltaAmount > 0 ? (
                                    <span className="text-emerald-400 font-bold text-xs">
                                      +{row.deltaAmount}
                                    </span>
                                  ) : (
                                    <span className="text-red-400 font-bold text-xs">{row.deltaAmount}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(!comparisonSplits || !diffRows) && (
                    <p className="py-6 text-center text-xs text-white/30">
                      Select two splits to compare their distributions.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Wizard Modal */}
      <AnimatePresence>
        {wizardOpen && (
          <SplitWizard
            open={wizardOpen}
            onClose={() => {
              setWizardOpen(false);
              setEditingSplit(undefined);
            }}
            onConfirm={handleWizardConfirm}
            initialData={
              editingSplit
                ? {
                    name: editingSplit.name,
                    recipients: editingSplit.recipients.map((r) => ({
                      id: r.id,
                      address: r.address,
                      label: r.label ?? "",
                      share: r.share,
                    })),
                    totalAmount: editingSplit.totalAmount,
                    asset: editingSplit.asset,
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
