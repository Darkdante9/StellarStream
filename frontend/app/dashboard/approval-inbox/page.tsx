'use client'

import { useState, useCallback, useMemo } from 'react'
import { BellIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { ApprovalCard, type Approval, type ApprovalStatus } from '@/components/approval/approval-card'

// ---------------------------------------------------------------------------
// Seed data — replace with real API/WebSocket data in production
// ---------------------------------------------------------------------------
const now = Date.now()

const INITIAL_APPROVALS: Approval[] = [
  {
    id: 'a1',
    type: 'Bulk payment',
    title: '24 USDC payments · Batch #2041',
    sub: 'Total: 4,800 USDC · 24 recipients',
    status: 'pending',
    amount: '4,800 USDC',
    network: 'Stellar mainnet',
    memo: 'Payroll June 2026',
    destination: 'Multi-address',
    expiresAt: now + 2 * 60 * 60 * 1000 + 14 * 60 * 1000,
    signers: [
      { name: 'Alex R.',   initials: 'AR', status: 'approved', time: '10:14 AM' },
      { name: 'Priya M.',  initials: 'PM', status: 'approved', time: '10:31 AM' },
      { name: 'Jordan K.', initials: 'JK', status: 'pending',  time: null },
    ],
    timeline: [
      { text: 'Batch created by Alex R.',  time: '9:58 AM',  color: '#378ADD', isLast: false },
      { text: 'Alex R. approved',          time: '10:14 AM', color: '#639922', isLast: false },
      { text: 'Priya M. approved',         time: '10:31 AM', color: '#639922', isLast: false },
      { text: 'Awaiting Jordan K.',        time: 'Now',      color: '#BA7517', isLast: true  },
    ],
  },
  {
    id: 'a2',
    type: 'Single transfer',
    title: '12,000 XLM to G4ZX…9KQ2',
    sub: '≈ $1,740 USD at current rate',
    status: 'pending',
    amount: '12,000 XLM',
    network: 'Stellar mainnet',
    memo: 'Vendor invoice #881',
    destination: 'G4ZX…9KQ2',
    expiresAt: now + 22 * 60 * 1000,
    signers: [
      { name: 'Sam D.',    initials: 'SD', status: 'approved', time: '11:02 AM' },
      { name: 'Jordan K.', initials: 'JK', status: 'pending',  time: null },
      { name: 'Priya M.',  initials: 'PM', status: 'pending',  time: null },
    ],
    timeline: [
      { text: 'Transfer initiated by Sam D.',    time: '10:55 AM', color: '#378ADD', isLast: false },
      { text: 'Sam D. approved',                time: '11:02 AM', color: '#639922', isLast: false },
      { text: 'Awaiting 2 more signers',        time: 'Now',      color: '#BA7517', isLast: true  },
    ],
  },
  {
    id: 'a3',
    type: 'Asset swap',
    title: 'Swap 500 USDC → EURT',
    sub: 'Via Stellar DEX · Est. rate 0.91',
    status: 'pending',
    amount: '500 USDC',
    network: 'Stellar DEX',
    memo: 'FX hedge Q3',
    destination: 'Internal',
    expiresAt: now + 5 * 60 * 60 * 1000 + 45 * 60 * 1000,
    signers: [
      { name: 'Alex R.', initials: 'AR', status: 'pending', time: null },
      { name: 'Sam D.',  initials: 'SD', status: 'pending', time: null },
    ],
    timeline: [
      { text: 'Swap queued by treasury bot', time: '8:00 AM', color: '#378ADD', isLast: false },
      { text: 'Awaiting all signers',        time: 'Now',     color: '#BA7517', isLast: true  },
    ],
  },
  {
    id: 'a4',
    type: 'Bulk payment',
    title: '8 EURT payments · Batch #2038',
    sub: 'Total: 2,200 EURT · 8 recipients',
    status: 'approved',
    amount: '2,200 EURT',
    network: 'Stellar mainnet',
    memo: 'EU contractor batch',
    destination: 'Multi-address',
    expiresAt: null,
    signers: [
      { name: 'Alex R.',  initials: 'AR', status: 'approved', time: 'Yesterday' },
      { name: 'Priya M.', initials: 'PM', status: 'approved', time: 'Yesterday' },
      { name: 'Sam D.',   initials: 'SD', status: 'approved', time: 'Yesterday' },
    ],
    timeline: [
      { text: 'Batch approved by all signers',   time: 'Yesterday 3:45 PM', color: '#639922', isLast: false },
      { text: 'Submitted to Stellar network',    time: 'Yesterday 3:46 PM', color: '#639922', isLast: true  },
    ],
  },
  {
    id: 'a5',
    type: 'Single transfer',
    title: '900 USDC to GCXK…3MN1',
    sub: 'Flagged: unusual destination',
    status: 'rejected',
    amount: '900 USDC',
    network: 'Stellar mainnet',
    memo: 'Unknown',
    destination: 'GCXK…3MN1',
    expiresAt: null,
    signers: [
      { name: 'Jordan K.', initials: 'JK', status: 'rejected', time: '2 days ago' },
      { name: 'Alex R.',   initials: 'AR', status: 'rejected', time: '2 days ago' },
    ],
    timeline: [
      { text: 'Transfer submitted',                    time: '2 days ago', color: '#378ADD', isLast: false },
      { text: 'Jordan K. rejected: unusual address',   time: '2 days ago', color: '#E24B4A', isLast: false },
      { text: 'Approval cancelled',                    time: '2 days ago', color: '#E24B4A', isLast: true  },
    ],
  },
]

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------
type FilterType = 'all' | ApprovalStatus

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Pending',  value: 'pending'  },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ApprovalInboxPage() {
  const [approvals, setApprovals] = useState<Approval[]>(INITIAL_APPROVALS)
  const [filter, setFilter]       = useState<FilterType>('all')

  const pendingCount = useMemo(
    () => approvals.filter(a => a.status === 'pending').length,
    [approvals],
  )

  const visible = useMemo(
    () => filter === 'all' ? approvals : approvals.filter(a => a.status === filter),
    [approvals, filter],
  )

  const handleApprove = useCallback((id: string) => {
    setApprovals(prev => prev.map(a => {
      if (a.id !== id) return a
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return {
        ...a,
        status: 'approved',
        timeline: [
          ...a.timeline.map(e => ({ ...e, isLast: false })),
          { text: 'You approved this request', time: ts, color: '#639922', isLast: true },
        ],
      }
    }))
  }, [])

  const handleReject = useCallback((id: string) => {
    setApprovals(prev => prev.map(a => {
      if (a.id !== id) return a
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return {
        ...a,
        status: 'rejected',
        timeline: [
          ...a.timeline.map(e => ({ ...e, isLast: false })),
          { text: 'You rejected this request', time: ts, color: '#E24B4A', isLast: true },
        ],
      }
    }))
  }, [])

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheckIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
          <h1 className="text-base font-medium text-gray-900">Approval inbox</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-[11px] font-medium rounded-full px-2 py-0.5 leading-none">
              {pendingCount}
            </span>
          )}
        </div>
        <button
          aria-label={`Notifications — ${pendingCount} pending`}
          className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <BellIcon className="w-5 h-5" />
          {pendingCount > 0 && (
            <span
              className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="flex gap-1.5 mb-5 flex-wrap"
        role="group"
        aria-label="Filter approvals"
      >
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              filter === f.value
                ? 'border-blue-400 text-blue-800 font-medium bg-blue-50'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
            }`}
            aria-pressed={filter === f.value}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 text-[11px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4" role="list" aria-label="Approval requests">
        {visible.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No {filter === 'all' ? '' : filter + ' '}approvals
          </div>
        ) : (
          visible.map(a => (
            <div key={a.id} role="listitem">
              <ApprovalCard
                approval={a}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}