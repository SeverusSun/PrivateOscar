import type { AwardResult, MovieEntry, PersonEntry, Profile } from '@/types'
import { AWARDS, MOVED_TO_FRONT_IDS } from '@/data/awards'

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
  /** 参评年份：只展示/评选该年（口径见 yearMode）的词条 */
  year: number
  /** 生涯评选模式：true 时从全部年份的词条中提名（仅标记年份口径下可用） */
  career: boolean
  /** 年份口径：marked=标记年份（何时记录），release=上映年份 */
  yearMode: 'marked' | 'release'
  /** 启用的奖项 id（传统奖项 + 可选奖项统一由此控制，默认全部开启） */
  enabledOptional: string[]
  /** 传统奖项整体开关：true 表示用户主动关闭（用于区分旧数据默认补开与用户选择） */
  classicOff?: boolean
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
  career: true,
  yearMode: 'marked',
  enabledOptional: AWARDS.map((a) => a.id),
  classicOff: false,
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
    const parsed = JSON.parse(raw) as AppState
    // 迁移一：传统奖项（原必选奖项）中的 6 项移入可选奖项，仅为旧版数据默认补开
    //（yearMode 是后加字段，缺省视为旧版数据；新版用户单独关闭其中某项应予以保留）
    const enabledOptional = [...(parsed.enabledOptional ?? [])]
    if (parsed.yearMode === undefined) {
      for (const id of MOVED_TO_FRONT_IDS) {
        if (!enabledOptional.includes(id)) enabledOptional.push(id)
      }
    }
    // 迁移二：必选奖项此前一直实际生效、但从未写入 enabledOptional；
    // 借助 classicOff 区分“旧数据默认补开”与“用户主动关闭传统奖项”
    const requiredIds = AWARDS.filter((a) => a.required).map((a) => a.id)
    const classicOff = parsed.classicOff === true
    if (!classicOff && !requiredIds.some((id) => enabledOptional.includes(id))) {
      for (const id of requiredIds) {
        if (!enabledOptional.includes(id)) enabledOptional.push(id)
      }
    }
    if (classicOff) {
      for (let i = enabledOptional.length - 1; i >= 0; i--) {
        if (requiredIds.includes(enabledOptional[i])) enabledOptional.splice(i, 1)
      }
    }
    return { ...defaultState, ...parsed, enabledOptional, classicOff }
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
