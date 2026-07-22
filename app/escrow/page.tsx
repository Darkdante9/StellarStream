"use client"

import React, { useState, useCallback, useEffect } from "react"
import { EscrowCard } from "@/components/EscrowCard"
import { CreateEscrowModal } from "@/components/CreateEscrowModal"
import { Plus, AlertTriangle, RefreshCw } from "lucide-react"

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

const STATE_STYLES: Record<string, string> = {
  PENDING_FUNDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACTIVE: "bg-blue-100 text-blue-800 border-blue-200",
  RELEASED: "bg-green-100 text-green-800 border-green-200",
  DISPUTED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-purple-100 text-purple-800 border-purple-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
}

const STATE_LABELS: Record<string, string> = {
  PENDING_FUNDING: "Pending Funding",
  ACTIVE: "Active",
  RELEASED: "Released",
  DISPUTED: "Disputed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
}

export default function EscrowPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterState, setFilterState] = useState<string>("all")

  const fetchEscrows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterState !== "all") params.set("state", filterState)

      const res = await fetch(`/api/v3/escrow?${params}`)
      const json = await res.json()

      if (json.success) {
        setEscrows(json.data)
      } else {
        setError(json.error || "Failed to fetch escrows")
      }
    } catch (err) {
      setError("Network error fetching escrows")
    } finally {
      setLoading(false)
    }
  }, [filterState])

  useEffect(() => {
    fetchEscrows()
  }, [fetchEscrows])

  const handleEscrowCreated = useCallback(() => {
    setShowCreateModal(false)
    fetchEscrows()
  }, [fetchEscrows])

  const handleEscrowUpdated = useCallback(() => {
    fetchEscrows()
  }, [fetchEscrows])

  const activeEscrows = escrows.filter(e => e.state === "ACTIVE" || e.state === "PENDING_FUNDING")
  const totalLocked = escrows
    .filter(e => e.state === "ACTIVE")
    .reduce((sum, e) => sum + BigInt(e.amount || "0"), BigInt(0))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Escrow Management
          </h1>
          <p className="text-gray-600">
            Create, manage, and resolve secure escrow agreements on Stellar.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">Total Escrows</div>
            <div className="text-2xl font-bold text-gray-900">{escrows.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">Active Escrows</div>
            <div className="text-2xl font-bold text-blue-600">{activeEscrows.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">In Dispute</div>
            <div className="text-2xl font-bold text-red-600">
              {escrows.filter(e => e.state === "DISPUTED").length}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
              aria-label="Create new escrow"
            >
              <Plus className="h-4 w-4" />
              Create Escrow
            </button>
            <button
              onClick={fetchEscrows}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              aria-label="Refresh escrows"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="state-filter" className="text-sm text-gray-600">
              Filter:
            </label>
            <select
              id="state-filter"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All States</option>
              <option value="PENDING_FUNDING">Pending Funding</option>
              <option value="ACTIVE">Active</option>
              <option value="DISPUTED">Disputed</option>
              <option value="RELEASED">Released</option>
              <option value="REFUNDED">Refunded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-gray-500">
            Loading escrows...
          </div>
        )}

        {/* Empty State */}
        {!loading && escrows.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-gray-500 mb-4">No escrows found</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              Create Your First Escrow
            </button>
          </div>
        )}

        {/* Escrow List */}
        {!loading && escrows.length > 0 && (
          <div className="space-y-4">
            {escrows.map((escrow) => (
              <EscrowCard
                key={escrow.id}
                escrow={escrow}
                onUpdate={handleEscrowUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Escrow Modal */}
      {showCreateModal && (
        <CreateEscrowModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleEscrowCreated}
        />
      )}
    </div>
  )
}
