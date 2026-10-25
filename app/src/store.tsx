import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AwardDef, AwardResult, MovieEntry, PersonEntry, Profile } from '@/types'
import { AWARDS } from '@/data/awards'
import { defaultState, loadState, saveState, type AppState } from '@/lib/storage'

interface StoreCtx extends AppState {
  setProfile: (p: Profile | null) => void
  setMovies: (m: MovieEntry[]) => void
  setYear: (y: number) => void
  setAwardMode: (m: 'oscars' | 'top') => void
  setTopN: (n: number) => void
  setTopCategory: (c: string) => void
  /** 设置/清除某名次的入选影片（movieId 传 null 清除） */
  setTopPick: (rank: number, movieId: string | null) => void
  /** 设置/清除某名次的颁奖词（undefined 清除） */
  setTopCitation: (rank: number, citation: string | undefined) => void
  /** 更新某名次的手动人物资料（上传图片/简介） */
  updateTopPick: (rank: number, patch: { person?: PersonEntry }) => void
  /** 交换两个名次的入选（含颁奖词/手动资料）；目标为空则等价于移动 */
  swapTopPicks: (from: number, to: number) => void
  setCareer: (c: boolean) => void
  toggleOptional: (id: string) => void
  /** 一键开启/关闭全部可选奖项 */
  setAllOptional: (on: boolean) => void
  /** 一键开启/关闭全部自定义奖项 */
  setAllCustom: (on: boolean) => void
  /** 删除全部自定义奖项（含其评选数据） */
  clearCustomAwards: () => void
  addCustomAward: (name: string) => void
  removeCustomAward: (id: string) => void
  toggleCustomAward: (id: string) => void
  /** 更新自定义奖项（目前用于补充奖项说明） */
  updateCustomAward: (id: string, patch: { description?: string }) => void
  /** 覆盖内置奖项（必选/可选）的说明；传空串清除覆盖、恢复默认说明 */
  setAwardDescription: (id: string, description: string) => void
  getResult: (awardId: string) => AwardResult
  patchResult: (awardId: string, patch: Partial<AwardResult>) => void
  /** 清空全部奖项的提名与获奖（状态徽标恢复为待评选） */
  clearResults: () => void
  /** 清空全部数据：同步账户、影库、已评选、Top 榜、海报自定义设置，恢复默认 */
  resetAll: () => void
  updateMovie: (id: string, patch: Partial<MovieEntry>) => void
  removeMovie: (id: string) => void
  /** 当年（year）记录的全部词条，按记录时间倒序 */
  moviesOfYear: MovieEntry[]
  /** 当前评选范围（年度 or 生涯）内可供提名的词条：生涯=全部，年度=当年 */
  eligibleMovies: MovieEntry[]
  /** 实际参与评选的奖项列表（必选 + 勾选的可选 + 自定义），按用户自定义顺序排列 */
  activeAwards: AwardDef[]
  movieById: (id: string) => MovieEntry | undefined
  /** 覆盖保存当前奖项排列顺序（完整 id 列表） */
  setAwardOrder: (ids: string[]) => void
}

const Ctx = createContext<StoreCtx | null>(null)

/** 历史数据清理：旧版「将奖项说明作为颁奖词」会把说明文本写进 citation，
 * 与「文本输入 > 电影短评 > 奖项说明」的自动回退语义冲突；
 * citation 恰好等于奖项说明时视为按钮残留，清除后回退逻辑自动生效 */
function migrateState(s: AppState): AppState {
  const descById = new Map<string, string>()
  for (const a of AWARDS) descById.set(a.id, a.description.trim())
  for (const c of s.customAwards) descById.set(c.id, (c.description ?? '').trim())
  let changed = false
  const results: AppState['results'] = {}
  for (const [id, r] of Object.entries(s.results)) {
    const d = descById.get(id)
    if (r.citation?.trim() && d && r.citation.trim() === d) {
      const { citation: _ignored, ...rest } = r
      results[id] = rest
      changed = true
    } else {
      results[id] = r
    }
  }
  return changed ? { ...s, results } : s
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => migrateState(loadState()))

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo<StoreCtx>(() => {
    const customDefs: AwardDef[] = state.customAwards
      .filter((c) => c.enabled !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? '',
        required: false,
        kind: 'movie' as const,
      }))
    // 内置奖项的说明覆盖（无覆盖时用默认说明）
    const applyDescOverride = (a: AwardDef): AwardDef => ({ ...a, description: state.awardDescOverrides[a.id] ?? a.description })
    const activeAwards = [
      ...AWARDS.filter((a) => a.required || state.enabledOptional.includes(a.id)).map(applyDescOverride),
      ...customDefs,
    ]
    // 应用用户自定义排序：出现在 awardOrder 中的按序前置，其余保持原顺序追加
    if (state.awardOrder.length > 0) {
      const pos = new Map(state.awardOrder.map((id, i) => [id, i]))
      activeAwards.sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity))
    }
    const moviesOfYear = state.movies
      .filter((m) => (m.markedAt || '').startsWith(String(state.year)))
      .sort((a, b) => (a.markedAt < b.markedAt ? 1 : -1))
    const eligibleMovies = state.career ? [...state.movies].sort((a, b) => (a.markedAt < b.markedAt ? 1 : -1)) : moviesOfYear
    const movieById = (id: string) => state.movies.find((m) => m.id === id)

    return {
      ...state,
      activeAwards,
      moviesOfYear,
      eligibleMovies,
      movieById,
      setAwardOrder: (ids) => setState((s) => ({ ...s, awardOrder: ids })),
      setCareer: (career) => setState((s) => ({ ...s, career })),
      setProfile: (profile) => setState((s) => ({ ...s, profile })),
      setMovies: (movies) => setState((s) => ({ ...s, movies })),
      setYear: (year) => setState((s) => ({ ...s, year })),
      setAwardMode: (awardMode) => setState((s) => ({ ...s, awardMode })),
      setTopN: (topN) => setState((s) => ({ ...s, topN })),
      setTopCategory: (topCategory) => setState((s) => ({ ...s, topCategory })),
      setTopPick: (rank, movieId) =>
        setState((s) => {
          const topPicks: AppState['topPicks'] = {}
          for (const [k, v] of Object.entries(s.topPicks)) {
            if (k === String(rank)) continue
            // 移动语义：同一影片只占一个名次，从其他名次移除
            if (movieId && v.movieId === movieId) continue
            topPicks[k] = v
          }
          if (movieId) topPicks[String(rank)] = { ...s.topPicks[String(rank)], movieId }
          return { ...s, topPicks }
        }),
      updateTopPick: (rank, patch) =>
        setState((s) => {
          const cur = s.topPicks[String(rank)]
          if (!cur) return s
          return { ...s, topPicks: { ...s.topPicks, [String(rank)]: { ...cur, ...patch } } }
        }),
      setTopCitation: (rank, citation) =>
        setState((s) => {
          const cur = s.topPicks[String(rank)]
          if (!cur) return s
          const topPicks = { ...s.topPicks, [String(rank)]: { ...cur, citation } }
          if (citation === undefined) {
            const { citation: _ignored, ...rest } = topPicks[String(rank)]
            topPicks[String(rank)] = rest
          }
          return { ...s, topPicks }
        }),
      /** 交换两个名次的入选（含颁奖词/手动资料）；目标为空则等价于移动 */
      swapTopPicks: (from, to) =>
        setState((s) => {
          const a = s.topPicks[String(from)]
          const b = s.topPicks[String(to)]
          const topPicks = { ...s.topPicks }
          if (b) topPicks[String(from)] = b
          else delete topPicks[String(from)]
          if (a) topPicks[String(to)] = a
          else delete topPicks[String(to)]
          return { ...s, topPicks }
        }),
      toggleOptional: (id) =>
        setState((s) => ({
          ...s,
          enabledOptional: s.enabledOptional.includes(id)
            ? s.enabledOptional.filter((x) => x !== id)
            : [...s.enabledOptional, id],
        })),
      setAllOptional: (on) =>
        setState((s) => ({
          ...s,
          enabledOptional: on ? AWARDS.filter((a) => !a.required).map((a) => a.id) : [],
        })),
      setAllCustom: (on) =>
        setState((s) => ({
          ...s,
          customAwards: s.customAwards.map((c) => ({ ...c, enabled: on })),
        })),
      clearCustomAwards: () =>
        setState((s) => {
          const results = { ...s.results }
          for (const c of s.customAwards) delete results[c.id]
          return { ...s, customAwards: [], results }
        }),
      addCustomAward: (name) =>
        setState((s) => ({
          ...s,
          customAwards: [...s.customAwards, { id: `custom-${Date.now()}`, name, enabled: true }],
        })),
      toggleCustomAward: (id) =>
        setState((s) => ({
          ...s,
          customAwards: s.customAwards.map((c) => (c.id === id ? { ...c, enabled: c.enabled === false } : c)),
        })),
      updateCustomAward: (id, patch) =>
        setState((s) => ({
          ...s,
          customAwards: s.customAwards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      setAwardDescription: (id, description) =>
        setState((s) => {
          const awardDescOverrides = { ...s.awardDescOverrides }
          if (description.trim()) awardDescOverrides[id] = description
          else delete awardDescOverrides[id]
          return { ...s, awardDescOverrides }
        }),
      removeCustomAward: (id) =>
        setState((s) => {
          const results = { ...s.results }
          delete results[id]
          return {
            ...s,
            customAwards: s.customAwards.filter((c) => c.id !== id),
            results,
          }
        }),
      getResult: (awardId) =>
        state.results[awardId] || { awardId, winner: null, nominations: [], person: null },
      clearResults: () => setState((s) => ({ ...s, results: {} })),
      resetAll: () => {
        // 海报/榜单自定义标题、开关、视图模式等本地设置
        for (const key of [
          'poster-custom-title',
          'poster-custom-subtitle',
          'poster-custom-list-title',
          'poster-custom-list-subtitle',
          'top-custom-title',
          'top-custom-subtitle',
          'poster-show-avatar',
          'poster-show-oscar',
          'library-view-mode',
        ]) {
          localStorage.removeItem(key)
        }
        // 豆瓣演职员缓存
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('douban-credits:')) localStorage.removeItem(key)
        }
        setState({ ...defaultState, createdAt: new Date().toISOString() })
      },      patchResult: (awardId, patch) =>
        setState((s) => ({
          ...s,
          results: {
            ...s.results,
            [awardId]: { ...(s.results[awardId] ?? { awardId, winner: null, nominations: [], person: null }), ...patch },
          },
        })),
      updateMovie: (id, patch) =>
        setState((s) => ({
          ...s,
          movies: s.movies.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      removeMovie: (id) => setState((s) => ({ ...s, movies: s.movies.filter((m) => m.id !== id) })),
    }
  }, [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用')
  return ctx
}
