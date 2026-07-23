'use client'

import { CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'

export type SignerStatusType = 'approved' | 'rejected' | 'pending'

export interface Signer {
  name: string
  initials: string
  status: SignerStatusType
  time?: string | null
}

const colorMap: Record<string, { bg: string; text: string }> = {
  blue:   { bg: '#B5D4F4', text: '#0C447C' },
  purple: { bg: '#CECBF6', text: '#3C3489' },
  teal:   { bg: '#9FE1CB', text: '#085041' },
  coral:  { bg: '#F5C4B3', text: '#993C1D' },
  amber:  { bg: '#FAC775', text: '#633806' },
}

const avatarColors = ['blue', 'purple', 'teal', 'coral', 'amber']

function getColor(index: number) {
  return colorMap[avatarColors[index % avatarColors.length]]
}

function StatusIcon({ status }: { status: SignerStatusType }) {
  if (status === 'approved') {
    return <CheckIcon className="w-3.5 h-3.5 text-green-600" aria-label="Approved" />
  }
  if (status === 'rejected') {
    return <XMarkIcon className="w-3.5 h-3.5 text-red-500" aria-label="Rejected" />
  }
  return <ClockIcon className="w-3.5 h-3.5 text-amber-600" aria-label="Pending" />
}

interface SignerChipProps {
  signer: Signer
  index: number
}

export function SignerChip({ signer, index }: SignerChipProps) {
  const color = getColor(index)
  const title = `${signer.name}: ${signer.status}${signer.time ? ' at ' + signer.time : ''}`

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-xs"
      title={title}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
        style={{ background: color.bg, color: color.text }}
        aria-hidden="true"
      >
        {signer.initials}
      </div>
      <span className="text-gray-600">{signer.name}</span>
      <StatusIcon status={signer.status} />
    </div>
  )
}

interface SignerStatusRowProps {
  signers: Signer[]
}

export function SignerStatusRow({ signers }: SignerStatusRowProps) {
  const approved = signers.filter(s => s.status === 'approved').length
  const rejected = signers.filter(s => s.status === 'rejected').length
  const pct = Math.round((approved / signers.length) * 100)
  const fillColor = rejected > 0 ? '#E24B4A' : '#97C459'

  return (
    <div className="space-y-2.5">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">
          <span>Signer progress</span>
          <span>{approved} of {signers.length} approved</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: fillColor }}
          />
        </div>
      </div>

      {/* Signer chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mr-1">
          Signers
        </span>
        {signers.map((signer, i) => (
          <SignerChip key={`${signer.name}-${i}`} signer={signer} index={i} />
        ))}
      </div>
    </div>
  )
}