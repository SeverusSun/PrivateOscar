import { useMemo, useState } from 'react'
import { Star, Search, Film, LayoutGrid, List } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/store'
import { proxiedImage } from '@/lib/storage'
import type { MovieEntry, MovieStatus } from '@/types'

const STATUS_LABEL: Record<MovieStatus, string> = { wish: '想看', doing: '在看', done: '看过' }

/** 豆瓣评分区间（按需求定义的边界） */
export const RATING_RANGES = [
  { id: 'all', name: '全部评分', test: () => true },
  { id: 'bad', name: '烂片 (7 分以下)', test: (r: number) => r < 7.0 },
  { id: 'pass', name: '及格 [7.0, 7.4]', test: (r: number) => r >= 7.0 && r < 7.4 },
  { id: 'avg', name: '中规中矩 (7.4, 8.0)', test: (r: number) => r > 7.4 && r < 8.0 },
  { id: 'good', name: '优秀作品 [8.0, 8.8)', test: (r: number) => r >= 8.0 && r < 8.8 },
  { id: 'god', name: '神作 [8.8, 10]', test: (r: number) => r >= 8.8 },
] as const

export type UserRatingKey = '1' | '2' | '3' | '4' | '5' | 'none'
export const USER_RATING_OPTIONS: { id: UserRatingKey; name: string }[] = [
  { id: '5', name: '★★★★★' },
  { id: '4', name: '★★★★' },
  { id: '3', name: '★★★' },
  { id: '2', name: '★★' },
  { id: '1', name: '★' },
  { id: 'none', name: '未评' },
]

export function StarDisplay({ value, className = '' }: { value: number | null; className?: string }) {
  const filled = value == null ? 0 : Math.round(value)
  return (
    <span className={`inline-flex items-center gap-0.5 text-[#e09015] ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < filled ? 'fill-current' : ''}`} />
      ))}
    </span>
  )
}

function MovieCard({ movie, onClick }: { movie: MovieEntry; onClick: () => void }) {
  return (
    <div className="group cursor-pointer overflow-hidden rounded-md bg-card shadow-sm transition hover:shadow-md" onClick={onClick}>
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {movie.poster ? (
          <img
            src={proxiedImage(movie.poster)}
            alt={movie.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-2.5">
        <div className="truncate text-sm font-medium" title={movie.title}>
          {movie.title}
        </div>
        <div className="truncate text-xs text-muted-foreground" title={movie.directors.map((d) => d.name).join(' / ')}>
          {movie.directors.length ? movie.directors.map((d) => d.name).join(' / ') : '—'}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#e09015]">
            {movie.doubanRating != null ? movie.doubanRating.toFixed(1) : '—'}
          </span>
          <StarDisplay value={movie.userRating} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{movie.markedAt?.slice(0, 10)}</span>
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {STATUS_LABEL[movie.status]}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function MovieDetailDialog({ movie, onClose }: { movie: MovieEntry | null; onClose: () => void }) {
  const { updateMovie } = useStore()
  if (!movie) return null
  const patch = (p: Partial<MovieEntry>) => updateMovie(movie.id, p)
  return (
    <Dialog open={!!movie} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left text-xl">
            {movie.title} {movie.year && <span className="text-muted-foreground">({movie.year})</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-5">
          <img
            src={movie.poster ? proxiedImage(movie.poster) : ''}
            alt={movie.title}
            referrerPolicy="no-referrer"
            className="w-36 shrink-0 rounded-md shadow"
          />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                豆瓣评分 <b className="text-[#e09015]">{movie.doubanRating?.toFixed(1) ?? '—'}</b>
              </span>
              <span>
                我的评分{' '}
                <select
                  className="rounded border bg-background px-1.5 py-0.5"
                  value={movie.userRating ?? ''}
                  onChange={(e) => patch({ userRating: e.target.value === '' ? null : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5) })}
                >
                  <option value="">未评</option>
                  {[5, 4, 3, 2, 1].map((v) => (
                    <option key={v} value={v}>
                      {'★'.repeat(v)}
                    </option>
                  ))}
                </select>
              </span>
              <span className="text-muted-foreground">{movie.markedAt?.slice(0, 10)} 标记</span>
            </div>
            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <Badge key={g} variant="outline">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
            {movie.directors.length > 0 && (
              <p className="text-sm text-muted-foreground">导演：{movie.directors.map((d) => d.name).join(' / ')}</p>
            )}
            {movie.actors.length > 0 && (
              <p className="text-sm text-muted-foreground">主演：{movie.actors.map((a) => a.name).join(' / ')}</p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">简介</Label>
              <Textarea rows={3} value={movie.intro} onChange={(e) => patch({ intro: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">我的短评</Label>
            <Textarea rows={3} placeholder="写点什么…" value={movie.shortComment} onChange={(e) => patch({ shortComment: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">长篇影评（可手动补录）</Label>
            <Textarea rows={3} placeholder="同步失败时可在此手动粘贴影评…" value={movie.longReview} onChange={(e) => patch({ longReview: e.target.value })} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 列表模式：每部影片一行展示 */
function MovieRow({ movie, onClick }: { movie: MovieEntry; onClick: () => void }) {
  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-md border bg-card px-3 py-2 transition hover:shadow-md"
      onClick={onClick}
    >
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-sm bg-muted">
        {movie.poster ? (
          <img src={proxiedImage(movie.poster)} alt={movie.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" title={movie.title}>
          {movie.title}
        </div>
        <div className="truncate text-xs text-muted-foreground" title={movie.directors.map((d) => d.name).join(' / ')}>
          {movie.directors.length ? movie.directors.map((d) => d.name).join(' / ') : '—'}
        </div>
      </div>
      <span className="shrink-0 text-sm font-bold text-[#e09015]">{movie.doubanRating != null ? movie.doubanRating.toFixed(1) : '—'}</span>
      <span className="hidden w-16 shrink-0 justify-end sm:inline-flex">
        <StarDisplay value={movie.userRating} />
      </span>
      <span className="hidden w-20 shrink-0 text-right text-[11px] text-muted-foreground md:inline">{movie.markedAt?.slice(0, 10)}</span>
      <Badge variant="secondary" className="w-12 shrink-0 justify-center px-1.5 py-0 text-[10px]">
        {STATUS_LABEL[movie.status]}
      </Badge>
    </div>
  )
}

export default function LibrarySection() {
  const { movies, year: awardYear } = useStore()
  const [status, setStatus] = useState<'all' | MovieStatus>('all')
  const [year, setYear] = useState<string>('all')
  const [rangeId, setRangeId] = useState<string>('all')
  const [userRatings, setUserRatings] = useState<Set<UserRatingKey>>(new Set())
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MovieEntry | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => (localStorage.getItem('library-view-mode') === 'list' ? 'list' : 'card'))

  const changeViewMode = (mode: 'card' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('library-view-mode', mode)
  }

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const m of movies) {
      const y = Number((m.markedAt || '').slice(0, 4))
      if (y > 1900) set.add(y)
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [movies])

  const toggleUserRating = (k: UserRatingKey) => {
    setUserRatings((s) => {
      const next = new Set(s)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const list = useMemo(() => {
    let l = movies
    if (status !== 'all') l = l.filter((m) => m.status === status)
    if (year !== 'all') l = l.filter((m) => (m.markedAt || '').startsWith(year))
    const range = RATING_RANGES.find((r) => r.id === rangeId)!
    l = l.filter((m) => (m.doubanRating != null ? range.test(m.doubanRating) : range.id === 'all'))
    if (userRatings.size > 0) {
      l = l.filter((m) => {
        const key: UserRatingKey = m.userRating != null ? (String(m.userRating) as UserRatingKey) : 'none'
        return userRatings.has(key)
      })
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      l = l.filter((m) => m.title.toLowerCase().includes(q) || m.directors.some((d) => d.name.includes(q)))
    }
    return l.sort((a, b) => (a.markedAt < b.markedAt ? 1 : -1))
  }, [movies, status, year, rangeId, userRatings, query])

  // 各状态下的数量（应用除状态外的其他筛选条件，便于对照）
  const statusCounts = useMemo(() => {
    const base = movies.filter((m) => {
      if (year !== 'all' && !(m.markedAt || '').startsWith(year)) return false
      const range = RATING_RANGES.find((r) => r.id === rangeId)!
      if (!(m.doubanRating != null ? range.test(m.doubanRating) : range.id === 'all')) return false
      if (userRatings.size > 0) {
        const key: UserRatingKey = m.userRating != null ? (String(m.userRating) as UserRatingKey) : 'none'
        if (!userRatings.has(key)) return false
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!(m.title.toLowerCase().includes(q) || m.directors.some((d) => d.name.includes(q)))) return false
      }
      return true
    })
    return {
      all: base.length,
      done: base.filter((m) => m.status === 'done').length,
      doing: base.filter((m) => m.status === 'doing').length,
      wish: base.filter((m) => m.status === 'wish').length,
    }
  }, [movies, year, rangeId, userRatings, query])

  const hasFilter = status !== 'all' || year !== 'all' || rangeId !== 'all' || userRatings.size > 0 || query.trim() !== ''

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* 第一行：状态 + 搜索 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <TabsList>
            <TabsTrigger value="all">全部 {statusCounts.all}</TabsTrigger>
            <TabsTrigger value="done">看过 {statusCounts.done}</TabsTrigger>
            <TabsTrigger value="doing">在看 {statusCounts.doing}</TabsTrigger>
            <TabsTrigger value="wish">想看 {statusCounts.wish}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索片名 / 导演…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {/* 第二行：年份 / 豆瓣评分 / 用户评分 多重筛选 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border bg-card p-3 text-sm">
        <Badge variant="default" className="bg-primary px-3 py-1">
          筛选结果 {list.length} 部
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">年份</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部年份</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y} 年{y === awardYear ? '（评选年）' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">豆瓣评分</span>
          <Select value={rangeId} onValueChange={setRangeId}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATING_RANGES.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">我的评分</span>
          <div className="flex flex-wrap gap-1.5">
            {USER_RATING_OPTIONS.map((o) => {
              const active = userRatings.has(o.id)
              return (
                <Badge
                  key={o.id}
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer px-2 py-0.5 text-xs"
                  onClick={() => toggleUserRating(o.id)}
                >
                  {o.name}
                </Badge>
              )
            })}
          </div>
        </div>
        {hasFilter && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setStatus('all'); setYear('all'); setRangeId('all'); setUserRatings(new Set()); setQuery('') }}>
            清除筛选
          </Button>
        )}
        {/* 视图切换：与上方筛选条件用分隔线分开 */}
        <div className="flex basis-full items-center gap-2 border-t pt-3">
          <span className="text-sm text-muted-foreground">视图</span>
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
            <button
              className={`flex items-center gap-1 rounded px-2.5 py-1 transition ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => changeViewMode('card')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> 卡片模式
            </button>
            <button
              className={`flex items-center gap-1 rounded px-2.5 py-1 transition ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => changeViewMode('list')}
            >
              <List className="h-3.5 w-3.5" /> 列表模式
            </button>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-md border border-dashed py-20 text-center text-muted-foreground">
          {movies.length === 0 ? '还没有同步到电影词条，请先到「同步」页抓取。' : '没有符合筛选条件的影片'}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {list.map((m) => (
            <MovieCard key={m.id} movie={m} onClick={() => setSelected(m)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {list.map((m) => (
            <MovieRow key={m.id} movie={m} onClick={() => setSelected(m)} />
          ))}
        </div>
      )}

      <MovieDetailDialog movie={selected ? (list.find((m) => m.id === selected.id) ?? selected) : null} onClose={() => setSelected(null)} />
    </div>
  )
}
