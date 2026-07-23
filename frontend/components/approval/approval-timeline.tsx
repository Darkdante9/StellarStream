'use client'

export interface TimelineEvent {
  text: string
  time: string
  color: string
  isLast: boolean
}

interface ApprovalTimelineProps {
  events: TimelineEvent[]
}

export function ApprovalTimeline({ events }: ApprovalTimelineProps) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-2">
        Activity
      </p>
      <div className="flex flex-col">
        {events.map((event, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            {/* Dot + connector */}
            <div className="flex flex-col items-center">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ background: event.color }}
                aria-hidden="true"
              />
              {!event.isLast && (
                <div className="w-px flex-1 bg-gray-200 min-h-[14px]" aria-hidden="true" />
              )}
            </div>

            {/* Content */}
            <div className={!event.isLast ? 'pb-2.5 flex-1' : 'flex-1'}>
              <p className="text-xs text-gray-500 leading-relaxed">{event.text}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}