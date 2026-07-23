'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { SignerStatusRow, type Signer } from './signer-status'
import { ApprovalTimeline, type TimelineEvent } from './approval-timeline'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Approval {
  id: string
  type: string
  title: string
  sub: string
  status: ApprovalStatus
  amount: string
  network: string
  memo: string
  destination: string
  expiresAt: number | null
  signers: Signer[]
  timeline: TimelineEvent[]
}

const statusStyles: Record<ApprovalStatus, string> = {
  pending:  'bg-amber-50 text-amber-800',
  approved: 'bg-green-50 text-green-800',
  rejected: 'bg-red-50 text-red-700',
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m}m remaining`
  if (m > 0) return `${m}m ${s}s remaining`
  return `${s}s remaining`
}

interface CountdownProps {
  expiresAt: number
}

function Countdown({ expiresAt }: CountdownProps) {
  const [ms, setMs] = useState(() => expiresAt - Date.now())
  const urgent = ms < 30 * 60 * 1000

  useEffect(() => {
    const id = setInterval(() => setMs(expiresAt - Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <div className={`flex items-center gap-1.5 text-sm ${urgent ? 'text-red-600' : 'text-gray-500'}`}>
      <ClockIcon className="w-4 h-4" aria-hidden="true" />
      <span>{formatCountdown(ms)}</span>
    </div>
  )
}

interface ApprovalCardProps {
  approval: Approval
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function ApprovalCard({ approval: a, onApprove, onReject }: ApprovalCardProps) {
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null)

  const handleAction = useCallback((action: 'approve' | 'reject') => {
    if (confirming === action) {
      action === 'approve' ? onApprove(a.id) : onReject(a.id)
      setConfirming(null)
    } else {
      setConfirming(action)
    }
  }, [confirming, a.id, onApprove, onReject])

  // Reset confirmation if user clicks elsewhere
  useEffect(() => {
    if (!confirming) return
    const id = setTimeout(() => setConfirming(null), 4000)
    return () => clearTimeout(id)
  }, [confirming])

  return (
    <article
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
      aria-label={`${a.type}: ${a.title}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-1">
            {a.type}
          </p>
          <h3 className="text-[15px] font-medium text-gray-900 truncate" title={a.title}>
            {a.title}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{a.sub}</p>
        </div>
        <span className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[a.status]}`}>
          {a.status}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Fields */}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {[
            { label: 'Amount',  value: a.amount,      mono: false },
            { label: 'Network', value: a.network,     mono: false },
            { label: 'Memo',    value: a.memo,        mono: false },
            { label: 'To',      value: a.destination, mono: true  },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {f.label}
              </span>
              <span className={`text-sm font-medium text-gray-800 ${f.mono ? 'font-mono text-xs' : ''}`}>
                {f.value}
              </span>
            </div>
          ))}
        </div>

        {/* Signers + progress */}
        <SignerStatusRow signers={a.signers} />

        {/* Timeline */}
        <ApprovalTimeline events={a.timeline} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 gap-3">
        {/* Timer or status stamp */}
        <div>
          {a.status === 'pending' && a.expiresAt ? (
            <Countdown expiresAt={a.expiresAt} />
          ) : (
            <span className="text-xs text-gray-400 capitalize">{a.status}</span>
          )}
        </div>

        {/* Actions */}
        {a.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('reject')}
              className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg border transition-colors
                ${confirming === 'reject'
                  ? 'bg-red-100 border-red-300 text-red-800 font-medium'
                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                }`}
            >
              <XMarkIcon className="w-4 h-4" aria-hidden="true" />
              {confirming === 'reject' ? 'Confirm reject' : 'Reject'}
            </button>
            <button
              onClick={() => handleAction('approve')}
              className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg border transition-colors
                ${confirming === 'approve'
                  ? 'bg-green-100 border-green-400 text-green-900 font-medium'
                  : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                }`}
            >
              <CheckIcon className="w-4 h-4" aria-hidden="true" />
              {confirming === 'approve' ? 'Confirm approve' : 'Approve'}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}