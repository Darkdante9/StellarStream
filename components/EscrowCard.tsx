"use client"

import React, { useState, useCallback } from "react"
import { Clock, Users, AlertTriangle, ArrowRight, RotateCcw, XCircle, CheckCircle, Shield } from "lucide-react"

interface EscrowParty {
  id: string
  address: string
  role: "DEPOSITOR" | "RECIPIENT" | "ARBITER"
  weight: number
  signed: boolean
}

interface EscrowDispute {
  id: string
  raisedBy: string
  reason: string
  resolution: string | null
  resolvedBy: string | null
  createdAt: string
}

interface Escrow {
  id: string
  title: string
  description: string | null
  tokenAddress: string
  amount: string
  state: "PENDING_FUNDING" | "ACTIVE" | "RELEASED" | "DISPUTED" | "REFUNDED" | "CANCELLED"
  releaseConditionType: "TIME_LOCK" | "MULTI_SIG" | "MILESTONE"
  releaseConditionData: string
  expiresAt: string | null
  contractId: string | null
  txHash: string | null
  createdAt: string
  parties: EscrowParty[]
  disputes: EscrowDispute[]
}

interface EscrowCardProps {
  escrow: Escrow
  onUpdate: () => void
}

const ROLE_LABELS: Record<string, string> = {
  DEPOSITOR: "Depositor",
  RECIPIENT: "Recipient",
  ARBITER: "Arbiter",
}

const ROLE_STYLES: Record<string, string> = {
  DEPOSITOR: "bg-blue-100 text-blue-700",
  RECIPIENT: "bg-green-100 text-green-700",
  ARBITER: "bg-purple-100 text-purple-700",
}

const CONDITION_LABELS: Record<string, string> = {
  TIME_LOCK: "Time Lock",
  MULTI_SIG: "Multi-Sig",
  MILESTONE: "Milestone",
}

const STATE_STYLES: Record<string, string> = {
  PENDING_FUNDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  RELEASED: "bg-green-100 text-green-800",
  DISPUTED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-gray-100 text-gray-800",
}

export const EscrowCard = React.memo(function EscrowCard({ escrow, onUpdate }: EscrowCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState("")
  const [showDisputeForm, setShowDisputeForm] = useState(false)

  const hasArbiter = escrow.parties.some(p => p.role === "ARBITER")
  const depositor = escrow.parties.find(p => p.role === "DEPOSITOR")
  const recipient = escrow.parties.find(p => p.role === "RECIPIENT")
  const arbiter = escrow.parties.find(p => p.role === "ARBITER")

  const handleAction = useCallback(async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/v3/escrow/${escrow.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (json.success) {
        onUpdate()
      }
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null)
    }
  }, [escrow.id, onUpdate])

  const handleRaiseDispute = useCallback(async () => {
    if (!disputeReason.trim()) return
    setActionLoading("dispute")
    try {
      const res = await fetch(`/api/v3/escrow/${escrow.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      })
      const json = await res.json()
      if (json.success) {
        setShowDisputeForm(false)
        setDisputeReason("")
        onUpdate()
      }
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null)
    }
  }, [escrow.id, disputeReason, onUpdate])

  const formatAmount = (amount: string) => {
    if (!amount) return "0"
    const val = BigInt(amount)
    const whole = val / BigInt(10000000)
    const frac = val % BigInt(10000000)
    return `${whole}.${frac.toString().padStart(7, "0")}`
  }

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATE_STYLES[escrow.state]}`}>
                {escrow.state.replace("_", " ")}
              </span>
              {actionLoading && (
                <span className="inline-block h-3 w-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin-slow" />
              )}
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {CONDITION_LABELS[escrow.releaseConditionType]}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{escrow.title}</h3>
            {escrow.description && (
              <p className="text-sm text-gray-500 mt-1">{escrow.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">{formatAmount(escrow.amount)}</div>
            <div className="text-xs text-gray-500">{truncateAddress(escrow.tokenAddress)}</div>
          </div>
        </div>

        {/* Parties */}
        <div className="flex flex-wrap gap-2 mb-3">
          {depositor && (
            <div className={`px-2 py-0.5 rounded text-xs ${ROLE_STYLES.DEPOSITOR}`}>
              {ROLE_LABELS.DEPOSITOR}: {truncateAddress(depositor.address)}
            </div>
          )}
          {recipient && (
            <div className={`px-2 py-0.5 rounded text-xs ${ROLE_STYLES.RECIPIENT}`}>
              {ROLE_LABELS.RECIPIENT}: {truncateAddress(recipient.address)}
            </div>
          )}
          {arbiter && (
            <div className={`px-2 py-0.5 rounded text-xs ${ROLE_STYLES.ARBITER}`}>
              {ROLE_LABELS.ARBITER}: {truncateAddress(arbiter.address)}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {escrow.state === "PENDING_FUNDING" && (
            <>
              <button
                onClick={() => handleAction("fund", { txHash: "pending", contractId: "pending" })}
                disabled={actionLoading === "fund"}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                <Shield className="h-3.5 w-3.5" />
                Fund Escrow
              </button>
              <button
                onClick={() => handleAction("cancel")}
                disabled={actionLoading === "cancel"}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </>
          )}

          {escrow.state === "ACTIVE" && (
            <>
              <button
                onClick={() => handleAction("release")}
                disabled={actionLoading === "release"}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Release
              </button>
              <button
                onClick={() => handleAction("refund")}
                disabled={actionLoading === "refund"}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Refund
              </button>
              <button
                onClick={() => setShowDisputeForm(!showDisputeForm)}
                disabled={actionLoading === "dispute"}
                className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-700 text-sm rounded-md hover:bg-red-50 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Dispute
              </button>
            </>
          )}

          {escrow.state === "DISPUTED" && hasArbiter && (
            <>
              <button
                onClick={() => handleAction("release")}
                disabled={actionLoading === "release"}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Resolve: Release
              </button>
              <button
                onClick={() => handleAction("refund")}
                disabled={actionLoading === "refund"}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Resolve: Refund
              </button>
            </>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            <ArrowRight className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
            Details
          </button>
        </div>

        {/* Dispute Form */}
        {showDisputeForm && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md animate-fade-in-up">
            <label className="block text-sm font-medium text-red-800 mb-1">
              Dispute Reason
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow duration-150"
              rows={3}
              placeholder="Describe the reason for the dispute..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleRaiseDispute}
                disabled={!disputeReason.trim() || actionLoading === "dispute"}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 active:scale-95 disabled:opacity-50 transition-all duration-150"
              >
                {actionLoading === "dispute" ? "Submitting..." : "Submit Dispute"}
              </button>
              <button
                onClick={() => { setShowDisputeForm(false); setDisputeReason("") }}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 active:scale-95 transition-all duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 animate-fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Escrow ID</div>
              <div className="text-gray-900 font-mono">{escrow.id}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Created</div>
              <div className="text-gray-900">{new Date(escrow.createdAt).toLocaleString()}</div>
            </div>
            {escrow.txHash && (
              <div>
                <div className="text-gray-500 mb-1">Transaction Hash</div>
                <div className="text-gray-900 font-mono text-xs break-all">{escrow.txHash}</div>
              </div>
            )}
            {escrow.contractId && (
              <div>
                <div className="text-gray-500 mb-1">Contract ID</div>
                <div className="text-gray-900 font-mono text-xs break-all">{escrow.contractId}</div>
              </div>
            )}
            {escrow.expiresAt && (
              <div>
                <div className="text-gray-500 mb-1">Expires</div>
                <div className="text-gray-900">{new Date(escrow.expiresAt).toLocaleString()}</div>
              </div>
            )}
            <div>
              <div className="text-gray-500 mb-1">Condition Data</div>
              <div className="text-gray-900 text-xs font-mono break-all">{escrow.releaseConditionData}</div>
            </div>
          </div>

          {/* All Parties */}
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">All Parties</div>
            <div className="space-y-1">
              {escrow.parties.map((party, idx) => (
                <div
                  key={party.id}
                  className="flex items-center justify-between text-sm px-3 py-1.5 bg-white rounded border border-gray-200 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[party.role]}`}>
                      {ROLE_LABELS[party.role]}
                    </span>
                    <span className="font-mono text-xs">{party.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {party.weight > 1 && (
                      <span className="text-xs text-gray-500">Weight: {party.weight}</span>
                    )}
                    <span className={`text-xs ${party.signed ? "text-green-600" : "text-gray-400"}`}>
                      {party.signed ? "Signed" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disputes */}
          {escrow.disputes.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Disputes</div>
              <div className="space-y-2">
                {escrow.disputes.map((dispute) => (
                  <div key={dispute.id} className="p-3 bg-white rounded border border-red-200 animate-fade-in">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-red-700">
                        Raised by {truncateAddress(dispute.raisedBy)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(dispute.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">{dispute.reason}</div>
                    {dispute.resolution && (
                      <div className="mt-2 text-sm text-green-700">
                        Resolved: {dispute.resolution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
