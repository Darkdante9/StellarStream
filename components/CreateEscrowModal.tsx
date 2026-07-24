"use client"

import React, { useState, useCallback } from "react"
import { X, AlertCircle } from "lucide-react"

interface CreateEscrowModalProps {
  onClose: () => void
  onCreated: () => void
}

interface PartyInput {
  address: string
  role: "DEPOSITOR" | "RECIPIENT" | "ARBITER"
  weight: number
}

export const CreateEscrowModal = React.memo(function CreateEscrowModal({ onClose, onCreated }: CreateEscrowModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tokenAddress, setTokenAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [releaseConditionType, setReleaseConditionType] = useState<"TIME_LOCK" | "MULTI_SIG" | "MILESTONE">("TIME_LOCK")
  const [timeLockTimestamp, setTimeLockTimestamp] = useState("")
  const [multiSigThreshold, setMultiSigThreshold] = useState("2")
  const [milestoneDescription, setMilestoneDescription] = useState("")
  const [parties, setParties] = useState<PartyInput[]>([
    { address: "", role: "DEPOSITOR", weight: 1 },
    { address: "", role: "RECIPIENT", weight: 1 },
  ])
  const [expiresAt, setExpiresAt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addParty = useCallback(() => {
    setParties(prev => [...prev, { address: "", role: "ARBITER", weight: 1 }])
  }, [])

  const removeParty = useCallback((index: number) => {
    setParties(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateParty = useCallback((index: number, field: keyof PartyInput, value: string | number) => {
    setParties(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }, [])

  const handleSubmit = useCallback(async () => {
    setError(null)

    if (!title.trim()) {
      setError("Title is required")
      return
    }
    if (!tokenAddress.trim()) {
      setError("Token address is required")
      return
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Valid amount is required")
      return
    }
    if (parties.filter(p => p.role === "DEPOSITOR").length === 0) {
      setError("At least one depositor is required")
      return
    }
    if (parties.filter(p => p.role === "RECIPIENT").length === 0) {
      setError("At least one recipient is required")
      return
    }
    if (parties.some(p => !p.address.trim())) {
      setError("All parties must have an address")
      return
    }

    let releaseConditionData: Record<string, unknown> = {}
    if (releaseConditionType === "TIME_LOCK") {
      if (!timeLockTimestamp) {
        setError("Release timestamp is required for time lock")
        return
      }
      releaseConditionData = { releaseTimestamp: new Date(timeLockTimestamp).getTime() / 1000 }
    } else if (releaseConditionType === "MULTI_SIG") {
      releaseConditionData = {
        approvers: parties.filter(p => p.role !== "ARBITER").map(p => p.address),
        threshold: parseInt(multiSigThreshold, 10),
      }
    } else if (releaseConditionType === "MILESTONE") {
      if (!milestoneDescription.trim()) {
        setError("Milestone description is required")
        return
      }
      releaseConditionData = { description: milestoneDescription.trim() }
    }

    setSubmitting(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        tokenAddress: tokenAddress.trim(),
        amount: amount.trim(),
        releaseConditionType,
        releaseConditionData,
        parties: parties.map(p => ({
          address: p.address.trim(),
          role: p.role,
          weight: p.weight,
        })),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }

      const res = await fetch("/api/v3/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        onCreated()
      } else {
        setError(json.error || "Failed to create escrow")
      }
    } catch {
      setError("Network error creating escrow")
    } finally {
      setSubmitting(false)
    }
  }, [title, description, tokenAddress, amount, releaseConditionType, timeLockTimestamp, multiSigThreshold, milestoneDescription, parties, expiresAt, onCreated])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Escrow Agreement</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Payment for services"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Optional description of the escrow agreement"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token Address *</label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
                placeholder="G..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (stroops) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="10000000"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Release Condition *</label>
            <select
              value={releaseConditionType}
              onChange={(e) => setReleaseConditionType(e.target.value as typeof releaseConditionType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="TIME_LOCK">Time Lock - Release after a specific time</option>
              <option value="MULTI_SIG">Multi-Sig - Requires multiple approvals</option>
              <option value="MILESTONE">Milestone - Requires arbiter verification</option>
            </select>
          </div>

          {releaseConditionType === "TIME_LOCK" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Release Date/Time *</label>
              <input
                type="datetime-local"
                value={timeLockTimestamp}
                onChange={(e) => setTimeLockTimestamp(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {releaseConditionType === "MULTI_SIG" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Threshold *</label>
              <input
                type="number"
                value={multiSigThreshold}
                onChange={(e) => setMultiSigThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Number of approvals required to release funds</p>
            </div>
          )}

          {releaseConditionType === "MILESTONE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Description *</label>
              <input
                type="text"
                value={milestoneDescription}
                onChange={(e) => setMilestoneDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Deliver Q1 report"
              />
              <p className="text-xs text-gray-500 mt-1">Arbiter must verify milestone completion</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Parties */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Parties *</label>
              <button
                onClick={addParty}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                + Add Party
              </button>
            </div>
            <div className="space-y-2">
              {parties.map((party, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={party.address}
                    onChange={(e) => updateParty(index, "address", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                    placeholder="G..."
                  />
                  <select
                    value={party.role}
                    onChange={(e) => updateParty(index, "role", e.target.value)}
                    className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="DEPOSITOR">Depositor</option>
                    <option value="RECIPIENT">Recipient</option>
                    <option value="ARBITER">Arbiter</option>
                  </select>
                  <input
                    type="number"
                    value={party.weight}
                    onChange={(e) => updateParty(index, "weight", parseInt(e.target.value, 10) || 1)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    min="1"
                    placeholder="Wt"
                  />
                  {parties.length > 2 && (
                    <button
                      onClick={() => removeParty(index)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      aria-label="Remove party"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Escrow"}
          </button>
        </div>
      </div>
    </div>
  )
})
