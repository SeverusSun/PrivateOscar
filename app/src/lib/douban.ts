import type { MovieEntry, MovieStatus, Profile } from '@/types'
import { largePoster } from './storage'

const BASE = '/api/douban'

async function fetchJson(path: string): Promise<any> {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`豆瓣接口返回 ${r.status}`)
  return r.json()
}

/** 从用户输入中解析豆瓣用户 id：支持纯 uid、people 链接、域名空间链接 */
export function parseUid(input: string): string {
  const s = input.trim()
  if (!s) throw new Error('请输入豆瓣用户 ID 或主页链接')
  const m = s.match(/(?:people|\/user)\/([A-Za-z0-9_-]+)/)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]+$/.test(s)) return s
  throw new Error('无法识别的账号格式，请输入用户 ID 或 https://www.douban.com/people/xxx 链接')
}

export async function fetchUser(uid: string): Promise<Profile> {
  const data = await fetchJson(`/user/${uid}`)
  if (!data || !data.id) throw new Error('未找到该用户，请检查 ID 是否公开可访问')
  return {
    uid: data.id,
    name: data.name || data.uid || uid,
    avatar: data.avatar || '',
    syncedAt: new Date().toISOString(),
  }
}

function mapStatus(s: string): MovieStatus {
  if (s === 'collect' || s === 'P' || s === 'done') return 'done'
  if (s === 'do' || s === 'F' || s === 'doing') return 'doing'
  return 'wish'
}

function mapInterest(it: any, includeTv: boolean): MovieEntry | null {
  const sub = it.subject
  if (!sub) return null
  // 默认只收电影词条；勾选「包含动画/剧集」后同时收录剧集（动画电影本就属于 movie 类型）
  if (sub.type !== 'movie' && !(includeTv && sub.type === 'tv')) return null
  const pic = sub.pic?.large || sub.pic?.normal || sub.cover_url || sub.cover?.large || ''
  return {
    id: String(sub.id),
    title: sub.title || '',
    originalTitle: sub.original_title || '',
    year: sub.year ? String(sub.year) : '',
    poster: largePoster(pic),
    intro: sub.intro || sub.card_subtitle || '',
    doubanRating: typeof sub.rating?.value === 'number' ? sub.rating.value : null,
    ratingCount: sub.rating?.count || 0,
    genres: sub.genres || [],
    directors: (sub.directors || sub.director || []).map((d: any) => ({ id: String(d.id), name: d.name })),
    actors: (sub.actors || []).slice(0, 8).map((a: any) => ({ id: String(a.id), name: a.name })),
    status: mapStatus(it.status),
    markedAt: it.create_time || '',
    userRating: typeof it.rating?.value === 'number' ? it.rating.value : null,
    shortComment: it.comment || '',
    longReview: '',
  }
}

/** 并发限制地补全词条详情（简介 / 演职员） */
async function enrichDetails(movies: MovieEntry[], concurrency = 4): Promise<MovieEntry[]> {
  const queue = movies.filter((m) => !m.intro || m.actors.length === 0)
  let idx = 0
  async function worker() {
    while (idx < queue.length) {
      const m = queue[idx++]
      try {
        const d = await fetchJson(`/movie/${m.id}`)
        m.intro = m.intro || d.intro || d.link2 || ''
        if ((!m.directors.length || !m.actors.length) && Array.isArray(d.directors)) {
          m.directors = d.directors.slice(0, 4).map((x: any) => ({ id: String(x.id), name: x.name }))
          m.actors = (d.actors || []).slice(0, 8).map((x: any) => ({ id: String(x.id), name: x.name }))
        }
        if (!m.genres.length && d.genres) m.genres = d.genres
      } catch {
        /* 单条失败可忽略 */
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return movies
}

/** 尽力同步用户的长篇影评，按 subject id 合并；失败则跳过（可手动补录） */
async function fetchLongReviews(uid: string): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  try {
    let start = 0
    for (let page = 0; page < 10; page++) {
      const data = await fetchJson(`/user/${uid}/reviews?start=${start}&count=20`)
      const items: any[] = data.reviews || data.items || []
      if (!items.length) break
      for (const r of items) {
        const sid = String(r.subject?.id || r.subject_id || '')
        if (sid && !map[sid]) map[sid] = r.title ? `${r.title}\n\n${r.abstract || ''}` : r.abstract || ''
      }
      start += items.length
      if (items.length < 20) break
    }
  } catch {
    /* 接口不可用时静默跳过 */
  }
  return map
}

export interface SyncProgress {
  phase: string
  done: number
  total: number
}

/** 同步某豆瓣账户的全部电影词条（想看 / 在看 / 看过）；options.includeTv 时一并同步剧集 */
export async function syncMovies(
  uid: string,
  onProgress?: (p: SyncProgress) => void,
  options?: { includeTv?: boolean }
): Promise<MovieEntry[]> {
  const includeTv = options?.includeTv ?? false
  onProgress?.({ phase: '正在获取书影音档案…', done: 0, total: 0 })
  const all: MovieEntry[] = []
  const seen = new Set<string>()
  const types = includeTv ? ['movie', 'tv'] : ['movie']
  for (const type of types) {
    let start = 0
    let total = Infinity
    let pages = 0
    // 豆瓣单页偶尔会少返回几条（49/47），不能以“短页”作为结束条件，
    // 必须以接口返回的 total 为准，否则会在第 2~3 页提前停止（曾导致 491 条只同步到 143 条）。
    while (start < total && pages < 300) {
      pages++
      const data = await fetchJson(`/user/${uid}/interests?type=${type}&start=${start}&count=50&order_by=time`)
      const items: any[] = data.interests || []
      if (typeof data.total === 'number') total = data.total
      if (!items.length) break
      for (const it of items) {
        const m = mapInterest(it, includeTv)
        if (m && !seen.has(m.id)) {
          seen.add(m.id)
          all.push(m)
        }
      }
      start += items.length
      onProgress?.({ phase: type === 'tv' ? '正在获取剧集档案…' : '正在获取书影音档案…', done: all.length, total })
      await new Promise((r) => setTimeout(r, 350)) // 放缓请求节奏，避免触发豆瓣限流
    }
  }

  onProgress?.({ phase: '正在补全影片详情…', done: 0, total: all.length })
  let done = 0
  const queue = all.filter((m) => !m.intro || !m.actors.length)
  let idx = 0
  async function worker() {
    while (idx < queue.length) {
      const m = queue[idx++]
      try {
        const d = await fetchJson(`/movie/${m.id}`)
        m.intro = m.intro || d.intro || ''
        if (Array.isArray(d.directors)) {
          m.directors = d.directors.slice(0, 4).map((x: any) => ({ id: String(x.id), name: x.name }))
          m.actors = (d.actors || []).slice(0, 8).map((x: any) => ({ id: String(x.id), name: x.name }))
        }
        if (!m.genres.length && d.genres) m.genres = d.genres
      } catch { /* 忽略单条失败 */ }
      done++
      onProgress?.({ phase: '正在补全影片详情…', done, total: queue.length })
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))

  onProgress?.({ phase: '正在获取长篇影评…', done: 0, total: all.length })
  const reviews = await fetchLongReviews(uid)
  for (const m of all) if (reviews[m.id]) m.longReview = reviews[m.id]

  return all
}

export { enrichDetails }

/** 演职员条目（豆瓣 credits 接口） */
export interface CreditEntry {
  id: string
  name: string
  avatar: string
  category: string
}

/** 抓取某影片的演职员列表（含照片），用于人物奖项自动匹配 */
export async function fetchCredits(movieId: string): Promise<CreditEntry[]> {
  const data = await fetchJson(`/movie/${movieId}/credits?start=0&count=50`)
  return (data.items || []).map((x: any) => ({
    id: String(x.id),
    name: x.name || '',
    avatar: x.avatar?.large || x.avatar?.normal || '',
    category: x.category || x.simple_character || '',
  }))
}
