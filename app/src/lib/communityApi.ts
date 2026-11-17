import type { PosterType, SelectionSnapshot } from '@/shared/selection'

export interface CommunityUser {
  id: string
  username: string
  displayName: string
  doubanUid: string | null
}

export interface UploadConflict {
  selectionId: string
  uploadedAt: string
  likeCount: number
  posters: { posterType: PosterType; likeCount: number }[]
}

export interface CommunityPoster {
  pictureId: string
  posterType: PosterType
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
  likeCount: number
  likedByMe: boolean
  uploadedAt: string
  selection: {
    selectionId: string
    ownerName: string
    mode: 'oscars' | 'top'
    scopeType: 'career' | 'marked' | 'release'
    scopeYear: number | null
    topCategoryKey: string | null
    topCategoryName: string | null
  }
}

export interface SelectionStatsGroup {
  id: string
  name: string
  entries: {
    movieId: string
    title: string
    directors: string
    doubanRating: number | null
    personName: string | null
    count: number
  }[]
}

export interface ExportDraft {
  blob: Blob
  selection: SelectionSnapshot | null
  pictureId: string
  posterType: PosterType
  filename: string
}

export class CommunityApiError extends Error {
  status: number
  conflict?: UploadConflict

  constructor(message: string, status: number, conflict?: UploadConflict) {
    super(message)
    this.status = status
    this.conflict = conflict
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/community${path}`, { credentials: 'include', ...init })
  } catch {
    throw new CommunityApiError('无法连接社区服务，请确认后端已启动', 0)
  }
  const data = await response.json().catch(() => ({})) as { error?: string; conflict?: UploadConflict }
  if (!response.ok) throw new CommunityApiError(data.error ?? `请求失败（${response.status}）`, response.status, data.conflict)
  return data as T
}

export const communityApi = {
  me: () => request<{ user: CommunityUser | null }>('/auth/me'),
  login: (body: { username: string; password: string; doubanUid?: string }) =>
    request<{ user: CommunityUser }>('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  register: (body: { username: string; password: string; displayName: string; doubanUid?: string }) =>
    request<{ user: CommunityUser }>('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  precheck: (selection: SelectionSnapshot, posterType: PosterType) =>
    request<{ conflict: UploadConflict | null }>('/selections/precheck', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection, posterType }),
    }),
  upload: async (draft: ExportDraft, conflictMode: 'none' | 'new' | 'overwrite') => {
    if (!draft.selection) throw new CommunityApiError('缺少评选数据', 400)
    const form = new FormData()
    form.append('selection', JSON.stringify(draft.selection))
    form.append('posterType', draft.posterType)
    form.append('pictureId', draft.pictureId)
    form.append('conflictMode', conflictMode)
    form.append('file', draft.blob, draft.filename)
    return request<{ poster: CommunityPoster; overwritten: boolean }>('/selections/upload', { method: 'POST', body: form })
  },
  posters: (query: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value))
    return request<{ items: CommunityPoster[]; total: number; page: number; pageSize: number; requiresAuth: boolean }>(`/posters?${params}`)
  },
  posterYears: (scope: 'marked' | 'release') =>
    request<{ years: number[] }>(`/posters/years?scope=${scope}`),
  like: (pictureId: string, liked: boolean) =>
    request<{ liked: boolean; likeCount: number }>(`/posters/${pictureId}/like`, { method: liked ? 'DELETE' : 'POST' }),
  deleteSelection: (selectionId: string) =>
    request<{ ok: true }>(`/selections/${selectionId}`, { method: 'DELETE' }),
  selectionStats: (mode: 'oscars' | 'top') =>
    request<{ mode: 'oscars' | 'top'; groups: SelectionStatsGroup[] }>(`/stats/selections?mode=${mode}`),
  recordEvent: (event: { eventId: string; eventType: 'visit' | 'export'; posterType?: PosterType; visitorId?: string }) =>
    request<{ ok: true }>('/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) }),
  siteStats: () => request<{ visitorCount: number; exportCounts: Record<PosterType, number> }>('/stats/site'),
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
