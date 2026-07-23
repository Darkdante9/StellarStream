"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, AlertTriangle, X, Check, Users, Wallet } from "lucide-react";

export interface SplitCardData {
  id: string;
  name: string;
  recipients: {
    id: string;
    address: string;
    amount: string;
    share: number;
    label?: string;
  }[];
  createdAt: Date;
  totalAmount: string;
  asset: string;
  status: "active" | "paused" | "completed";
}

interface SplitCardProps {
  split: SplitCardData;
  selected?: boolean;
  onSelect: () => void;
  onEdit: (split: SplitCardData) => void;
  onDelete: (id: string) => void;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  paused: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  completed: "bg-white/5 text-white/40 border-white/10",
};

export default function SplitCard({ split, selected, onSelect, onEdit, onDelete }: SplitCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalShare = split.recipients.reduce((sum, r) => sum + r.share, 0);

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(split.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`group relative w-full rounded-2xl border p-5 backdrop-blur-xl transition-all ${
        selected
          ? "border-cyan-400/40 bg-cyan-400/[0.04] shadow-[0_0_20px_rgba(0,245,255,0.08)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
      role="article"
      aria-label={`Split: ${split.name}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => handleKeyDown(e, onSelect)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-white">{split.name}</h3>
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                STATUS_COLORS[split.status]
              }`}
            >
              {split.status}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {split.recipients.length} recipient{split.recipients.length !== 1 && "s"}
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {split.totalAmount} {split.asset}
            </span>
            <span>{formatDate(new Date(split.createdAt))}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(split);
            }}
            className="rounded-lg p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            aria-label={`Edit ${split.name}`}
            tabIndex={0}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className={`rounded-lg p-2 transition-colors focus:outline-none focus:ring-1 focus:ring-red-400/50 ${
              confirmDelete
                ? "bg-red-400/20 text-red-400"
                : "text-white/30 hover:bg-white/5 hover:text-red-400"
            }`}
            aria-label={confirmDelete ? `Confirm delete ${split.name}` : `Delete ${split.name}`}
            tabIndex={0}
          >
            {confirmDelete ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 overflow-hidden"
        >
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="flex-1 text-xs text-red-300">Are you sure? This cannot be undone.</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="rounded-md p-1 text-red-400/60 hover:text-red-300 transition-colors"
              aria-label="Cancel delete"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      <div className="mt-4 space-y-1.5">
        {split.recipients.slice(0, 4).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-1.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs text-white/70">{r.label || truncateAddress(r.address)}</span>
            </div>
            <span className="shrink-0 font-mono text-xs text-cyan-400/80">
              {totalShare > 0 ? ((r.share / totalShare) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        ))}
        {split.recipients.length > 4 && (
          <p className="text-center text-[11px] text-white/30">
            +{split.recipients.length - 4} more
          </p>
        )}
      </div>
    </motion.div>
  );
}
