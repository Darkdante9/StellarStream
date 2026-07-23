"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StreamData } from "@/components/view-stream-client";

interface ActionButtonsProps {
  stream: StreamData;
}

type ActionType = "pause" | "resume" | "cancel" | "withdraw" | "topup";

interface ActionModal {
  type: ActionType;
  gasEstimate: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
}

const ACTION_MODALS: Record<ActionType, ActionModal> = {
  pause: {
    type: "pause",
    gasEstimate: "0.0012 XLM",
    description: "Pause the stream. Funds will stop flowing until resumed.",
    confirmLabel: "Pause Stream",
  },
  resume: {
    type: "resume",
    gasEstimate: "0.0011 XLM",
    description: "Resume the stream. Funds will continue flowing.",
    confirmLabel: "Resume Stream",
  },
  cancel: {
    type: "cancel",
    gasEstimate: "0.0015 XLM",
    description:
      "Cancel the stream permanently. Unstreamed funds return to sender. This action cannot be undone.",
    confirmLabel: "Cancel Stream",
    danger: true,
  },
  withdraw: {
    type: "withdraw",
    gasEstimate: "0.0013 XLM",
    description:
      "Withdraw streamed funds to your wallet.",
    confirmLabel: "Withdraw Funds",
  },
  topup: {
    type: "topup",
    gasEstimate: "0.0010 XLM",
    description:
      "Add more funds to the stream. Extends the stream duration.",
    confirmLabel: "Add Funds",
  },
};

/**
 * Action Buttons — quick action buttons with hover effects, ripple animation,
 * and modals showing gas estimates for each operation.
 */
export function ActionButtons({ stream }: ActionButtonsProps) {
  const [activeModal, setActiveModal] = useState<ActionType | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: string } | null>(null);

  const isActive = stream.status === "active";
  const isPaused = stream.status === "paused";

  const actions: { type: ActionType; label: string; icon: React.ReactNode; available: boolean }[] = [
    {
      type: "pause",
      label: "Pause",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      available: isActive,
    },
    {
      type: "resume",
      label: "Resume",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      available: isPaused,
    },
    {
      type: "withdraw",
      label: "Withdraw",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      available: true,
    },
    {
      type: "topup",
      label: "Top Up",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      available: isActive || isPaused,
    },
    {
      type: "cancel",
      label: "Cancel",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      available: isActive || isPaused,
    },
  ];

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, type: ActionType) => {
      // Ripple effect
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setRipple({ x, y, id: type });
      setTimeout(() => setRipple(null), 600);

      // Open modal
      setActiveModal(type);
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!activeModal) return;
    setLoadingAction(activeModal);
    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoadingAction(null);
    setActiveModal(null);
  }, [activeModal]);

  return (
    <>
      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
      >
        <p className="mb-4 font-body text-[10px] uppercase tracking-widest text-white/35">
          Quick Actions
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {actions.map((action) => (
            <button
              key={action.type}
              onClick={(e) => handleClick(e, action.type)}
              disabled={!action.available}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`${action.label} stream`}
            >
              {/* Ripple layer */}
              {ripple?.id === action.type && (
                <span
                  className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    animation: "ripple-anim 0.6s ease-out forwards",
                  }}
                />
              )}

              {/* Icon */}
              <div className="mb-1.5 flex justify-center text-white/40 transition-colors group-hover:text-[#00f5ff] group-hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.3)]">
                {action.icon}
              </div>

              {/* Label */}
              <span className="font-body text-[10px] font-medium uppercase tracking-wider text-white/40 transition-colors group-hover:text-white/70">
                {action.label}
              </span>

              {/* Glow border on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  boxShadow: "inset 0 0 20px rgba(0,245,255,0.05)",
                }}
              />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a14] p-6 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={() => setActiveModal(null)}
                className="absolute right-4 top-4 text-white/30 transition-colors hover:text-white/60"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal icon */}
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                  ACTION_MODALS[activeModal].danger
                    ? "bg-red-500/10 text-red-400"
                    : "bg-[#00f5ff]/10 text-[#00f5ff]"
                }`}
              >
                {actions.find((a) => a.type === activeModal)?.icon}
              </div>

              {/* Title */}
              <h2 className="font-heading text-lg font-bold text-white">
                {ACTION_MODALS[activeModal].confirmLabel}
              </h2>

              {/* Description */}
              <p className="mt-2 font-body text-sm text-white/50">
                {ACTION_MODALS[activeModal].description}
              </p>

              {/* Stream info */}
              <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-body text-white/40">Stream</span>
                  <span className="font-ticker text-white/70">{stream.name}</span>
                </div>
              </div>

              {/* Gas estimate */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-body text-xs text-white/50">Estimated Gas Fee</span>
                </div>
                <span className="font-ticker text-sm font-semibold text-amber-400">
                  {ACTION_MODALS[activeModal].gasEstimate}
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 font-body text-sm text-white/50 transition-colors hover:border-white/20 hover:text-white/70"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loadingAction === activeModal}
                  className={`flex-1 rounded-xl py-2.5 font-body text-sm font-semibold transition-all ${
                    ACTION_MODALS[activeModal].danger
                      ? "bg-red-500/80 text-white hover:bg-red-500"
                      : "bg-[#00f5ff]/80 text-black hover:bg-[#00f5ff]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {loadingAction === activeModal ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    ACTION_MODALS[activeModal].confirmLabel
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ripple animation keyframes injected once */}
      <style>{`
        @keyframes ripple-anim {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `}</style>
    </>
  );
}