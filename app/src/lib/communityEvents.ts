import { communityApi } from '@/lib/communityApi'
import { createUuid32, type PosterType } from '@/shared/selection'

const VISITOR_KEY = 'community-visitor-id'
const QUEUE_KEY = 'community-pending-events'
let visitTracked = false
let flushPromise: Promise<void> | null = null

type CommunityEvent = {
  eventId: string
  eventType: 'visit' | 'export'
  posterType?: PosterType
  visitorId?: string
}

function readQueue(): CommunityEvent[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as CommunityEvent[] } catch { return [] }
}

function writeQueue(events: CommunityEvent[]): void {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-100))) } catch { /* 本地空间不足时仅放弃离线补报 */ }
}

function enqueue(event: CommunityEvent): void {
  writeQueue([...readQueue(), event])
}

export function flushCommunityEvents(): Promise<void> {
  if (flushPromise) return flushPromise
  flushPromise = (async () => {
    const queue = readQueue()
    const pending: CommunityEvent[] = []
    for (const event of queue) {
      try { await communityApi.recordEvent(event) } catch { pending.push(event) }
    }
    const originalIds = new Set(queue.map((event) => event.eventId))
    const addedDuringFlush = readQueue().filter((event) => !originalIds.has(event.eventId))
    writeQueue([...pending, ...addedDuringFlush])
  })().finally(() => { flushPromise = null })
  return flushPromise
}

export function trackCommunityVisit(): void {
  if (visitTracked) return
  visitTracked = true
  let visitorId = localStorage.getItem(VISITOR_KEY)
  if (!visitorId || !/^[0-9a-f]{32}$/.test(visitorId)) {
    visitorId = createUuid32()
    localStorage.setItem(VISITOR_KEY, visitorId)
  }
  enqueue({ eventId: createUuid32(), eventType: 'visit', visitorId })
  void flushCommunityEvents()
}

export function trackPosterExport(posterType: PosterType): void {
  enqueue({ eventId: createUuid32(), eventType: 'export', posterType })
  void flushCommunityEvents()
}
