"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import SplitChart from "./split-chart";

interface WizardRecipient {
  id: string;
  address: string;
  label: string;
  share: number;
}

interface SplitWizardProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    name: string;
    recipients: WizardRecipient[];
    totalAmount: string;
    asset: string;
  }) => void;
  initialData?: {
    name: string;
    recipients: WizardRecipient[];
    totalAmount: string;
    asset: string;
  };
}

function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

export default function SplitWizard({ open, onClose, onConfirm, initialData }: SplitWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [recipients, setRecipients] = useState<WizardRecipient[]>([]);
  const [asset, setAsset] = useState("XLM");
  const [totalAmount, setTotalAmount] = useState("1000");
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      if (initialData) {
        setName(initialData.name);
        setRecipients(initialData.recipients);
        setAsset(initialData.asset);
        setTotalAmount(initialData.totalAmount);
        setStep(1);
      } else {
        setName("");
        setRecipients([]);
        setAsset("XLM");
        setTotalAmount("1000");
        setStep(1);
      }
      setError(null);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    };
  }, [open, onClose]);

  const addRecipient = useCallback(() => {
    setRecipients((prev) => [
      ...prev,
      { id: generateId(), address: "", label: "", share: 0 },
    ]);
  }, []);

  const updateRecipient = useCallback(
    (id: string, updates: Partial<WizardRecipient>) => {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const removeRecipient = useCallback((id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const totalShare = recipients.reduce((sum, r) => sum + r.share, 0);
  const shareValid = Math.abs(totalShare - 100) < 0.01;
  const hasEmptyAddresses = recipients.some((r) => !r.address.trim());

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError("Please enter a split name.");
        return;
      }
      if (recipients.length === 0) {
        setError("Add at least one recipient.");
        return;
      }
      if (hasEmptyAddresses) {
        setError("All recipients need an address.");
        return;
      }
      if (!shareValid && recipients.length > 1) {
        setError("Shares must total 100%.");
        return;
      }
    }
    setError(null);
    setStep((s) => Math.min(s + 1, 3));
  };

  const handlePrev = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleConfirm = () => {
    if (step === 3) {
      onConfirm({ name, recipients, totalAmount, asset });
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gray-950/60 p-1 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-violet-500/10 blur-[80px]" />

        <div className="relative p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  onClick={handlePrev}
                  className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <h2 id="wizard-title" className="text-xl font-bold text-white">
                {initialData ? "Edit Split" : "Create Split"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
              aria-label="Close wizard"
            >
              <ChevronRight className="h-5 w-5 rotate-45" />
            </button>
          </div>

          {/* Stepper */}
          <div className="mb-6 flex items-center gap-2 px-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                    step >= s
                      ? "border-cyan-400 bg-cyan-400 text-black"
                      : "border-white/10 text-white/20"
                  }`}
                  aria-current={step === s ? "step" : undefined}
                >
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                <span
                  className={`hidden text-[10px] font-semibold uppercase tracking-widest sm:block ${
                    step >= s ? "text-white" : "text-white/20"
                  }`}
                >
                  {s === 1 ? "Details" : s === 2 ? "Review" : "Confirm"}
                </span>
                {s < 3 && (
                  <div
                    className={`h-px w-8 rounded-full ${step > s ? "bg-cyan-400" : "bg-white/5"}`}
                  />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/40">
                    Split Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Monthly Payroll"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/80">Recipients</h3>
                  <button
                    onClick={addRecipient}
                    className="flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-400/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {recipients.length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
                      <Users className="mb-2 h-8 w-8 text-white/10" />
                      <p className="text-xs text-white/30">No recipients yet.</p>
                    </div>
                  ) : (
                    recipients.map((r, i) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <span className="w-4 text-center text-xs font-mono text-white/20">{i + 1}</span>
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={r.address}
                            onChange={(e) => updateRecipient(r.id, { address: e.target.value })}
                            placeholder="G... or stellar address"
                            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-xs text-white placeholder-white/15 outline-none focus:border-cyan-400/50"
                          />
                          <input
                            type="text"
                            value={r.label}
                            onChange={(e) => updateRecipient(r.id, { label: e.target.value })}
                            placeholder="Label (opt)"
                            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white placeholder-white/15 outline-none focus:border-cyan-400/50 sm:w-28"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={r.share || ""}
                              onChange={(e) =>
                                updateRecipient(r.id, {
                                  share: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                                })
                              }
                              placeholder="%"
                              className="w-16 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-center font-mono text-xs text-white placeholder-white/15 outline-none focus:border-cyan-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-white/30">%</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeRecipient(r.id)}
                          className="rounded-lg p-1.5 text-white/20 hover:text-red-400 transition-colors"
                          aria-label={`Remove recipient ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {recipients.length > 1 && (
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
                    <span className="text-xs text-white/40">Total allocation</span>
                    <span
                      className={`font-mono text-sm font-bold ${
                        shareValid ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {totalShare.toFixed(1)}%
                    </span>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/90 transition-all"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/80">Allocation Review</h3>
                  <button
                    onClick={handlePrev}
                    className="text-xs font-semibold text-cyan-400 underline transition-colors hover:text-cyan-300"
                  >
                    Edit Recipients
                  </button>
                </div>

                <SplitChart recipients={recipients} animated />

                <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
                    {recipients.map((r, i) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-white/30 font-mono w-4">{i + 1}</span>
                          <span className="font-mono text-xs text-white/70 truncate">
                            {r.label || (r.address ? `${r.address.slice(0, 6)}...` : "—")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={r.share || ""}
                            onChange={(e) =>
                              updateRecipient(r.id, {
                                share: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                              })
                            }
                            className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center font-mono text-xs text-white outline-none focus:border-cyan-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-white/30">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/90 transition-all"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <h3 className="text-sm font-semibold text-white/80">Confirm Split</h3>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Name</span>
                    <span className="text-sm font-semibold text-white">{name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Recipients</span>
                    <span className="flex items-center gap-1 text-sm text-white">
                      <Users className="h-3.5 w-3.5 text-cyan-400" />
                      {recipients.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Total Amount</span>
                    <span className="flex items-center gap-1 text-sm font-bold text-cyan-400">
                      <Wallet className="h-3.5 w-3.5" />
                      {totalAmount} {asset}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Asset</span>
                    <span className="font-mono text-sm text-white">{asset}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                  <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                    {recipients.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs text-white/70 truncate">
                            {r.label || `${r.address.slice(0, 8)}...`}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-cyan-400/80 shrink-0">
                          {r.share.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {initialData ? "Save Changes" : "Create Split"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
