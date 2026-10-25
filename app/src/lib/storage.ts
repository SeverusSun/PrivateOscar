import type { AwardResult, MovieEntry, PersonEntry, Profile } from '@/types'
import { AWARDS } from '@/data/awards'

export interface AppState {
  profile: Profile | null
  movies: MovieEntry[]
  /** 评选模式：oscars=奥斯卡奖项评选，top=Top 榜排名评选 */
  awardMode: 'oscars' | 'top'
  /** Top 榜的榜单长度 N */
  topN: number
  /** Top 榜的榜单类别（如：最佳、科幻） */
  topCategory: string
  /** Top 榜各名次的入选影片：名次(字符串) → 影片、颁奖词与手动人物资料 */
  topPicks: Record<string, { movieId: string; citation?: string; person?: PersonEntry }>
  /** 参评年份：只展示/评选该年记录的词条 */
  year: number
  /** 生涯评选模式：true 时从全部年份的词条中提名 */
  career: boolean
  /** 启用的可选奖项 id */
  enabledOptional: string[]
  /** 用户自定义奖项池（默认启用，可开关、可删除，可补充说明） */
  customAwards: { id: string; name: string; enabled?: boolean; description?: string }[]
  /** 内置奖项（必选/可选）的说明覆盖：id → 自定义说明；无覆盖时用默认说明 */
  awardDescOverrides: Record<string, string>
  /** 用户自定义的奖项排列顺序（award id 列表） */
  awardOrder: string[]
  /** 每个奖项的评选结果 */
  results: Record<string, AwardResult>
  createdAt: string
}

const KEY = 'personal-oscars-state-v1'

export const defaultState: AppState = {
  profile: null,
  movies: [],
  awardMode: 'oscars',
  topN: 10,
  topCategory: '最佳',
  topPicks: {},
  year: new Date().getFullYear() - 1,
  career: false,
  enabledOptional: AWARDS.filter((a) => !a.required).map((a) => a.id),
  customAwards: [],
  awardDescOverrides: {},
  awardOrder: [],
  results: {},
  createdAt: new Date().toISOString(),
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState
    return { ...defaultState, ...(JSON.parse(raw) as AppState) }
  } catch {
    return defaultState
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('保存失败：本地存储空间不足', e)
  }
}

export function clearState() {
  localStorage.removeItem(KEY)
}

/** 从豆瓣海报地址换取大图地址 */
export function largePoster(url: string): string {
  if (!url) return ''
  return url.replace(/\/s\/(ratio_poster\d+|\w+)\/public\//, '/l/').replace('/view/photo/s_ratio_poster/', '/view/photo/l_ratio_poster/')
}

/** 图片走本地代理，避免导出海报时跨域污染画布 */
export function proxiedImage(url: string): string {
  if (!url) return ''
  const m = url.match(/^https:\/\/img(\d+)\.doubanio\.com(.*)$/)
  if (m) return `/api/img${m[2]}`
  return url
}
