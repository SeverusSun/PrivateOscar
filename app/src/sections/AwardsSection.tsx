import { useEffect, useMemo, useRef, useState } from 'react'
import { Award, Trash2, Crown, ImagePlus, PlusCircle, Pencil, ChevronUp, ChevronDown, CheckSquare, Search, GripVertical, MousePointerClick, Quote } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/store'
import { proxiedImage } from '@/lib/storage'
import { resolvePerson, useCreditsLoader } from '@/lib/persons'
import { OPTIONAL_AWARDS, ORDERED_OPTIONAL_AWARDS, REQUIRED_AWARDS } from '@/data/awards'
import { TBD_ID, type AwardDef, type Nomination, type PersonEntry } from '@/types'
import { StarDisplay, RATING_RANGES, USER_RATING_OPTIONS, type UserRatingKey } from './LibrarySection'

/** Top 榜预设类别 */
const TOP_CATEGORIES = ['最佳', '最爱', '导演', '科幻', '剧情', '爱情', '家庭', '惊悚', '奇幻', '喜剧', '历史', '动画']

/** Top 榜「导演」类别的合成奖项定义：仅用于复用 resolvePerson 的导演照片自动匹配 */
const TOP_DIRECTOR_AWARD: AwardDef = { id: 'top-director', name: '导演 Top', description: '', required: false, kind: 'manual' }

/** 选片弹窗共用筛选栏：豆瓣评分区间（单选）+ 我的评分（多选），逻辑与影库一致 */
function DialogFilters({
  rangeId,
  onRangeChange,
  userRatings,
  onUserRatingsChange,
}: {
  rangeId: string
  onRangeChange: (id: string) => void
  userRatings: Set<UserRatingKey>
  onUserRatingsChange: (next: Set<UserRatingKey>) => void
}) {
  const toggleUserRating = (k: UserRatingKey) => {
    const next = new Set(userRatings)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    onUserRatingsChange(next)
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <span className="text-muted-foreground">豆瓣评分</span>
      <Select value={rangeId} onValueChange={onRangeChange}>
        <SelectTrigger className="h-7 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RATING_RANGES.map((r) => (
            <SelectItem key={r.id} value={r.id} className="text-xs">
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">我的评分</span>
      <div className="flex items-center gap-1">
        {USER_RATING_OPTIONS.map((o) => (
          <button
            key={o.id}
            className={`rounded border px-1.5 py-0.5 transition ${
              userRatings.has(o.id) ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => toggleUserRating(o.id)}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 演员类奖项：编辑资料时提供该片前 4 位演员作为候选，选中后自动匹配豆瓣照片 */
const ACTOR_AWARD_IDS = ['best-actor', 'best-actress', 'best-supporting-actor', 'best-supporting-actress', 'favorite-actor', 'favorite-actress']

/** 多选提名弹窗：勾选多部影片后点「完成提名」统一加入 */
function NominationPickerDialog({
  open,
  onClose,
  nominations,
  pool = 'done',
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  nominations: Nomination[]
  pool?: 'done' | 'wish'
  onConfirm: (movieIds: string[]) => void
}) {
  const { movies, eligibleMovies } = useStore()
  const [checked, setChecked] = useState<Set<string>>(() => new Set(nominations.map((n) => n.movieId)))
  const [query, setQuery] = useState('')
  const [rangeId, setRangeId] = useState<string>('all')
  const [userRatings, setUserRatings] = useState<Set<UserRatingKey>>(new Set())
  // 每次打开弹窗时重置筛选
  useEffect(() => {
    if (open) {
      setRangeId('all')
      setUserRatings(new Set())
    }
  }, [open])
  // 「看过」类奖项限评选范围（年度=当年，生涯=全部）；「最期待」等想看类奖项跨全部年份
  const poolLabel = pool === 'wish' ? '想看' : '看过'
  const poolMovies = useMemo(
    () => (pool === 'wish' ? movies : eligibleMovies).filter((m) => m.status === pool),
    [movies, eligibleMovies, pool]
  )
  const filtered = useMemo(() => {
    let l = poolMovies
    const range = RATING_RANGES.find((r) => r.id === rangeId)!
    l = l.filter((m) => (m.doubanRating != null ? range.test(m.doubanRating) : range.id === 'all'))
    if (userRatings.size > 0) {
      l = l.filter((m) => userRatings.has(m.userRating != null ? (String(m.userRating) as UserRatingKey) : 'none'))
    }
    const q = query.trim().toLowerCase()
    if (q) l = l.filter((m) => m.title.toLowerCase().includes(q) || m.directors.some((d) => d.name.toLowerCase().includes(q)))
    return l
  }, [poolMovies, query, rangeId, userRatings])

  const MAX_NOMINATIONS = 9
  const toggle = (id: string) =>
    setChecked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else {
        if (next.size >= MAX_NOMINATIONS) {
          toast.error(`提名最多 ${MAX_NOMINATIONS} 部`)
          return s
        }
        next.add(id)
      }
      return next
    })

  // 「未定」词条：勾选后其余影片置灰不可选
  const tbdChecked = checked.has(TBD_ID)
  const toggleTbd = (on: boolean) => setChecked(on ? new Set([TBD_ID]) : new Set())

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-h-[80vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>选择提名影片（可多选，最多 {MAX_NOMINATIONS} 部）· 从「{poolLabel}」中挑选</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索片名 / 导演…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <DialogFilters rangeId={rangeId} onRangeChange={setRangeId} userRatings={userRatings} onUserRatingsChange={setUserRatings} />
        <div className="max-h-[46vh] space-y-0.5 overflow-y-auto rounded-md border p-2">
          {/* 未定词条 */}
          <label
            className={`mb-1 flex cursor-pointer items-start gap-2.5 rounded border border-dashed px-2 py-2 ${
              tbdChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted'
            }`}
          >
            <Checkbox className="mt-0.5" checked={tbdChecked} onCheckedChange={(v) => toggleTbd(!!v)} />
            <span>
              <span className="block text-sm font-medium">未定</span>
              <span className="block text-xs text-muted-foreground">感觉选不出合适的呢</span>
            </span>
          </label>
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">没有「{poolLabel}」的影片</div>}
          {filtered.map((m) => {
            const nominated = nominations.some((n) => n.movieId === m.id)
            return (
              <label
                key={m.id}
                className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm ${
                  tbdChecked
                    ? 'cursor-not-allowed opacity-40'
                    : `cursor-pointer hover:bg-muted ${nominated ? 'text-muted-foreground' : ''}`
                }`}
              >
                <Checkbox disabled={tbdChecked} checked={checked.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                <span className="flex-1 truncate">
                  {m.title}
                  {nominated && <span className="ml-1 text-[11px]">（已提名）</span>}
                </span>
                <span className="text-xs font-bold text-[#e09015]">{m.doubanRating?.toFixed(1) ?? '—'}</span>
                <StarDisplay value={m.userRating} />
              </label>
            )
          })}
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <span className="text-sm text-muted-foreground">已勾选 {checked.size} 项</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={() => {
                onConfirm(Array.from(checked))
                onClose()
              }}
            >
              <CheckSquare className="mr-1.5 h-4 w-4" /> 完成提名
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 人物资料编辑：上传照片/图片 + 姓名 + 简介（挂在某个提名上） */
function PersonEditor({ value, onChange, candidates }: { value: PersonEntry | undefined; onChange: (p: PersonEntry | undefined) => void; candidates?: string[] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const p: PersonEntry = value || { name: '', image: '', intro: '', movieTitle: '' }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) {
      toast.error('图片请小于 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange({ ...p, image: String(reader.result) })
    reader.readAsDataURL(f)
  }

  return (
    <div className="flex gap-3 rounded-md bg-muted/50 p-3">
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-sm border border-dashed bg-background hover:bg-muted"
        >
          {p.image ? (
            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <span className="text-[10px] text-muted-foreground">照片/图片</span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      <div className="flex-1 space-y-1.5">
        {candidates && candidates.length > 0 && (
          <select
            className="h-8 w-full rounded-md border bg-background px-2 text-sm"
            value=""
            onChange={(e) => {
              const name = e.target.value
              if (name) onChange({ ...p, name })
            }}
          >
            <option value="">从主演中选择（自动匹配照片）…</option>
            {candidates.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
        <Input
          className="h-8 text-sm"
          placeholder="人物姓名 / 设计方名称"
          value={p.name}
          onChange={(e) => onChange({ ...p, name: e.target.value })}
        />
      </div>
    </div>
  )
}

/** 颁奖词按钮 + 悬浮编辑卡片：展示优先级为 文本输入 > 电影短评 > 奖项说明，无输入时自动逐级回退 */
function CitationButton({ citation, description, shortComment, onChange }: { citation?: string; description: string; shortComment: string; onChange: (citation: string | undefined) => void }) {
  const custom = citation ?? ''
  const effective = custom.trim() || shortComment.trim() || description.trim()
  const effectiveSource = custom.trim() ? '文本输入' : shortComment.trim() ? '默认：电影短评' : description.trim() ? '默认：奖项说明' : '无'
  const useShortComment = () => {
    const sc = shortComment.trim()
    if (!sc) {
      toast.error('获奖影片没有用户短评')
      return
    }
    if (custom.trim() === sc) {
      // 第二次点击：清空，恢复自动回退
      onChange(undefined)
      toast.success('已清空，恢复自动回退')
    } else {
      onChange(sc)
      toast.success('已将电影短评填入颁奖词')
    }
  }
  const useDescription = () => {
    const d = description.trim()
    if (!d) {
      toast.error('该奖项没有奖项说明')
      return
    }
    if (custom.trim() === d) {
      // 第二次点击：清空，恢复自动回退
      onChange(undefined)
      toast.success('已清空，恢复自动回退')
    } else {
      onChange(d)
      toast.success('已将奖项说明填入颁奖词')
    }
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`h-7 px-2 text-xs ${effective ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
        >
          <Quote className="mr-1 h-3.5 w-3.5" />
          颁奖词
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">颁奖词输入</p>
          <Textarea
            rows={3}
            placeholder="输入颁奖词…"
            value={custom}
            onChange={(e) => onChange(e.target.value)}
          />
          {/* 预览框：显示按优先级解析后的实际颁奖词 */}
          <div className="rounded-md border bg-muted/40 p-2">
            <p className="text-[10px] text-muted-foreground">
              颁奖词预览（{effectiveSource}）
            </p>
            <p className="mt-0.5 text-xs leading-relaxed">{effective ? `“${effective}”` : '（无颁奖词）'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="secondary" className="w-full" onClick={useShortComment}>
              将电影短评作为颁奖词
            </Button>
            <Button size="sm" variant="secondary" className="w-full" onClick={useDescription}>
              将奖项说明作为颁奖词
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            优先级：文本输入 &gt; 电影短评 &gt; 奖项说明；再次点击同一按钮可清空并恢复自动回退。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Top 榜单选弹窗：点击影片即为该名次入选；已被其他名次占用的影片置灰，二次点击确认移动 */
function TopPickDialog({ open, onClose, onPick, currentRank }: { open: boolean; onClose: () => void; onPick: (movieId: string) => void; currentRank: number }) {
  const { eligibleMovies, topPicks } = useStore()
  const [query, setQuery] = useState('')
  const [pendingMove, setPendingMove] = useState<string | null>(null)
  const [rangeId, setRangeId] = useState<string>('all')
  const [userRatings, setUserRatings] = useState<Set<UserRatingKey>>(new Set())
  useEffect(() => {
    if (!open) setPendingMove(null)
    // 每次打开弹窗时重置筛选
    if (open) {
      setRangeId('all')
      setUserRatings(new Set())
    }
  }, [open])
  // Top 榜只从评选范围内的「看过」影片中挑选
  const poolMovies = useMemo(() => eligibleMovies.filter((m) => m.status === 'done'), [eligibleMovies])
  const filtered = useMemo(() => {
    let l = poolMovies
    const range = RATING_RANGES.find((r) => r.id === rangeId)!
    l = l.filter((m) => (m.doubanRating != null ? range.test(m.doubanRating) : range.id === 'all'))
    if (userRatings.size > 0) {
      l = l.filter((m) => userRatings.has(m.userRating != null ? (String(m.userRating) as UserRatingKey) : 'none'))
    }
    const q = query.trim().toLowerCase()
    if (q) l = l.filter((m) => m.title.toLowerCase().includes(q) || m.directors.some((d) => d.name.toLowerCase().includes(q)))
    return l
  }, [poolMovies, query, rangeId, userRatings])
  /** 影片已被占用的名次（不含当前名次） */
  const rankOf = (id: string) => Object.entries(topPicks).find(([k, p]) => p.movieId === id && Number(k) !== currentRank)?.[0]

  const handlePick = (id: string) => {
    const inOther = rankOf(id)
    if (inOther) {
      if (pendingMove === id) {
        // 第二次点击：确认移动，store 会将其从原名次移除
        onPick(id)
        onClose()
      } else {
        setPendingMove(id)
        toast(`该电影已在 Top ${inOther}，再次点击确认移到这里`)
      }
    } else {
      onPick(id)
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-h-[80vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>选择该名次的影片 · 从「看过」中挑选</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索片名 / 导演…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <DialogFilters rangeId={rangeId} onRangeChange={setRangeId} userRatings={userRatings} onUserRatingsChange={setUserRatings} />
        <div className="max-h-[46vh] space-y-0.5 overflow-y-auto rounded-md border p-2">
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">没有「看过」的影片</div>}
          {filtered.map((m) => {
            const inOther = rankOf(m.id)
            return (
              <button
                key={m.id}
                className={`flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition ${
                  inOther ? `opacity-40 hover:opacity-70 ${pendingMove === m.id ? 'bg-primary/10 opacity-70' : ''}` : 'hover:bg-muted'
                }`}
                onClick={() => handlePick(m.id)}
              >
                <img
                  src={m.poster ? proxiedImage(m.poster) : ''}
                  alt={m.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-11 w-8 shrink-0 rounded-sm object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.directors.map((d) => d.name).join(' / ')} · 豆瓣 {m.doubanRating?.toFixed(1) ?? '—'}
                  </span>
                </span>
                <StarDisplay value={m.userRating} className="shrink-0" />
                {inOther && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">Top {inOther}</Badge>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">点击影片即入选该名次；已入选其他名次的影片置灰显示，再次点击可移动到该名次。</p>
      </DialogContent>
    </Dialog>
  )
}

/** Top 榜名次卡片：复用奖项卡片设计；点击选片即为该名次，无提名/拖拽/获奖未定；「导演」类别自动匹配导演照片 */
function TopCard({ rank, collapsed }: { rank: number; collapsed?: boolean }) {
  const { topPicks, setTopPick, setTopCitation, updateTopPick, swapTopPicks, movieById, topCategory } = useStore()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const pick = topPicks[String(rank)]
  const movie = pick ? movieById(pick.movieId) : undefined
  const isDirector = topCategory === '导演'
  // 导演类别：懒加载演职员数据，用于自动匹配导演照片（手动上传优先）
  useCreditsLoader(pick && isDirector && movie ? [movie.id] : [])
  const resolved = isDirector && movie && pick ? resolvePerson(TOP_DIRECTOR_AWARD, { movieId: movie.id, person: pick.person }, movie) : null

  return (
    <Card
      className={movie ? 'border-primary/40' : ''}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/plain')) e.preventDefault()
      }}
      onDrop={(e) => {
        const from = Number(e.dataTransfer.getData('text/plain'))
        // 源名次未选影片时拖动无效
        if (from && from !== rank && topPicks[String(from)]) swapTopPicks(from, rank)
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-bold"
              style={{ color: rank === 1 ? '#c9a227' : rank === 2 ? '#9aa3ad' : rank === 3 ? '#b0793a' : '#1b4332' }}
            >
              Top {rank}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {movie && (
              <CitationButton
                citation={pick.citation}
                description=""
                shortComment={movie.shortComment ?? ''}
                onChange={(citation) => setTopCitation(rank, citation)}
              />
            )}
            {movie ? (
              <Badge className="h-7 w-[66px] justify-center rounded-md bg-primary">已评出</Badge>
            ) : (
              <Badge variant="outline" className="h-7 w-[66px] justify-center rounded-md">待评选</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
      <CardContent className="space-y-3">
        {movie ? (
          <>
          <div className="flex items-center gap-3 rounded-md border p-2">
            {resolved?.image ? (
              <img
                src={resolved.manual ? resolved.image : proxiedImage(resolved.image)}
                alt={resolved.name || movie.title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="h-16 w-11 shrink-0 rounded-sm object-cover"
              />
            ) : (
              <img
                src={movie.poster ? proxiedImage(movie.poster) : ''}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="h-16 w-11 shrink-0 rounded-sm object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              {resolved?.name ? (
                <>
                  <div className="truncate text-sm font-medium">{resolved.name}</div>
                  <div className="truncate text-xs text-muted-foreground">《{movie.title}》</div>
                </>
              ) : (
                <>
                  <div className="truncate text-sm font-medium">{movie.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{movie.directors.map((d) => d.name).join(' / ')}</div>
                </>
              )}
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                豆瓣 <b className="text-[#e09115]">{movie.doubanRating?.toFixed(1) ?? '—'}</b>
                <StarDisplay value={movie.userRating} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs ${editing || pick.person?.image || pick.person?.name ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                onClick={() => setEditing((v) => !v)}
              >
                <ImagePlus className="mr-1 h-3.5 w-3.5" /> 上传图片/简介
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 px-0 text-muted-foreground hover:text-destructive"
                title="清除该名次"
                onClick={() => setTopPick(rank, null)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {editing && (
            <div className="mt-1.5">
              <PersonEditor value={pick.person} onChange={(p) => updateTopPick(rank, { person: p })} />
            </div>
          )}
          </>
        ) : (
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setPickerOpen(true)}>
            <CheckSquare className="mr-2 h-4 w-4" />
            为 Top {rank} 选择影片…
          </Button>
        )}
        <TopPickDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(id) => setTopPick(rank, id)} currentRank={rank} />
      </CardContent>
      )}
    </Card>
  )
}

function AwardCard({ award, collapsed }: { award: AwardDef; collapsed?: boolean }) {
  const { getResult, patchResult, movieById, career } = useStore()
  const result = getResult(award.id)
  const id = award.id
  const nominations = result.nominations
  const winnerId = result.winner?.movieId || null
  const [editing, setEditing] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // 懒加载全部提名影片的演职员数据，用于自动匹配人物照片
  const nominatedMovieIds = nominations.filter((n) => n.movieId !== TBD_ID).map((n) => n.movieId)
  useCreditsLoader(nominatedMovieIds)

  /** 弹窗确认后：勾选的即最终提名集合（上限 9 部）；保留未取消提名的人物资料，被取消的随之删除 */
  const confirmNominations = (movieIds: string[]) => {
    const keep = new Set(movieIds)
    const next = movieIds.slice(0, 9).map((mid) => nominations.find((n) => n.movieId === mid) || { movieId: mid })
    patchResult(id, {
      nominations: next,
      // 原获奖者若仍在新提名集合中，则跟随移动到新位置；否则清空
      winner: result.winner && keep.has(result.winner.movieId) && next.some((n) => n.movieId === result.winner!.movieId) ? result.winner : null,
      // 没有任何真实提名时，获奖未定自动关闭
      winnerTbd: next.some((n) => n.movieId !== TBD_ID) ? result.winnerTbd : false,
    })
    toast.success(`已更新提名，共 ${next.length} 部`)
  }

  const patchNomination = (movieId: string, patch: Partial<Nomination>) => {
    patchResult(id, {
      nominations: nominations.map((n) => (n.movieId === movieId ? { ...n, ...patch } : n)),
    })
  }

  /** 设为获奖：同时把该提名移到提名列表最上方；再次点击取消获奖 */
  const setWinnerNomination = (n: Nomination) => {
    if (winnerId === n.movieId) {
      patchResult(id, { winner: null })
    } else {
      patchResult(id, {
        winner: { ...n },
        nominations: [n, ...nominations.filter((x) => x.movieId !== n.movieId)],
      })
    }
  }

  const removeNomination = (movieId: string) => {
    const remaining = nominations.filter((x) => x.movieId !== movieId)
    patchResult(id, {
      nominations: remaining,
      winner: winnerId === movieId ? null : result.winner,
      // 没有任何真实提名时，获奖未定自动关闭
      winnerTbd: remaining.some((n) => n.movieId !== TBD_ID) ? result.winnerTbd : false,
    })
    if (editing === movieId) setEditing(null)
  }

  const complete = !!winnerId

  return (
    <Card className={complete ? 'border-primary/40' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className={`h-4 w-4 ${complete ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="font-bold">{award.name}</span>
            {award.description && (
              <span className="hidden text-xs text-muted-foreground md:inline">· {award.description}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {complete && !result.winnerTbd && (
              <CitationButton
                citation={result.citation}
                description={award.description}
                shortComment={winnerId && winnerId !== TBD_ID ? (movieById(winnerId)?.shortComment ?? '') : ''}
                onChange={(citation) => patchResult(id, { citation })}
              />
            )}
            <span className="flex items-center gap-1">
              <Switch
                className="scale-[0.8]"
                checked={!!result.winnerTbd}
                disabled={!result.winnerTbd && !nominations.some((n) => n.movieId !== TBD_ID)}
                title={
                  result.winnerTbd
                    ? '都很强，选不出来'
                    : nominations.some((n) => n.movieId !== TBD_ID)
                      ? undefined
                      : '请先添加提名，再开启获奖未定'
                }
                onCheckedChange={(on) => patchResult(id, { winnerTbd: on, winner: on ? null : result.winner })}
              />
              <span className="cursor-pointer text-[10px] leading-none text-muted-foreground">获奖未定</span>
            </span>
            {result.winnerTbd ? (
              <Badge variant="secondary" className="h-7 w-[66px] justify-center rounded-md">获奖未定</Badge>
            ) : nominations.some((n) => n.movieId === TBD_ID) ? (
              <Badge variant="secondary" className="h-7 w-[66px] justify-center rounded-md">提名未定</Badge>
            ) : complete ? (
              <Badge className="h-7 w-[66px] justify-center rounded-md bg-primary">已评出</Badge>
            ) : (
              <Badge variant="outline" className="h-7 w-[66px] justify-center rounded-md">待评选</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
      <CardContent className="space-y-3">
        {nominations.length > 0 && (
          <div className="space-y-1.5">
            {nominations.map((n) => {
              const isWinner = winnerId === n.movieId
              const isEditing = editing === n.movieId
              if (n.movieId === TBD_ID) {
                return (
                  <div
                    key={TBD_ID}
                    className={`flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-sm ${
                      isWinner ? 'border-[#c9a227] bg-[#fdf6e3]' : 'border-border'
                    }`}
                  >
                    {isWinner && <Crown className="h-4 w-4 shrink-0 text-[#c9a227]" />}
                    <span className="flex-1">
                      <b>未定</b>
                      <span className="ml-1.5 text-xs text-muted-foreground">感觉选不出合适的呢</span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 px-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeNomination(TBD_ID)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              }
              const movie = movieById(n.movieId)
              if (!movie) return null
              const resolved = resolvePerson(award, n, movie)
              return (
                <div key={n.movieId}>
                  <div
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                      isWinner ? 'border-[#c9a227] bg-[#fdf6e3]' : 'border-border'
                    }`}
                  >
                    {resolved.image ? (
                      <img
                        src={resolved.manual ? resolved.image : proxiedImage(resolved.image)}
                        alt={resolved.name || movie.title}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                        title={resolved.manual ? '手动上传的照片' : '自动匹配的豆瓣演职员照片'}
                      />
                    ) : null}
                    <span className="flex-1 truncate">
                      {n.person?.name ? (
                        <>
                          <b>{n.person.name}</b>
                          <span className="text-muted-foreground"> · 《{movie.title}》</span>
                        </>
                      ) : (
                        movie.title
                      )}
                      {award.id.includes('director') && movie.directors.length > 0 && (
                        <span className="text-muted-foreground">　{movie.directors.map((d) => d.name).join(' / ')}</span>
                      )}
                      {isWinner && <Crown className="ml-1 inline h-4 w-4 text-[#c9a227]" />}
                    </span>
                    <span className="text-xs font-bold text-[#e09015]">{movie.doubanRating?.toFixed(1) ?? '—'}</span>
                    <StarDisplay value={movie.userRating} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 px-2 text-xs ${isEditing || n.person?.image || n.person?.name ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                      onClick={() => setEditing(isEditing ? null : n.movieId)}
                    >
                      {isEditing ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      {isEditing ? '收起' : n.person?.name ? '资料' : '上传图片/简介'}
                    </Button>
                    <Button
                      size="sm"
                      variant={isWinner ? 'secondary' : 'ghost'}
                      className="h-7 px-2 text-xs"
                      disabled={!!result.winnerTbd}
                      onClick={() => setWinnerNomination(n)}
                    >
                      {isWinner ? '取消获奖' : '设为获奖'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 px-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeNomination(n.movieId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {isEditing && (
                    <div className="mt-1.5">
                      <PersonEditor
                        value={n.person}
                        onChange={(p) => patchNomination(n.movieId, { person: p })}
                        candidates={
                          ACTOR_AWARD_IDS.includes(award.id)
                            ? (movieById(n.movieId)?.actors ?? []).slice(0, 4).map((a) => a.name)
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setPickerOpen(true)}>
          <CheckSquare className="mr-2 h-4 w-4" />
          {nominations.length > 0
            ? `已提名 ${nominations.length} 部，点击调整…`
            : award.pool === 'wish'
              ? '从全部「想看」中选提名（可多选）…'
              : career
                ? '从全部「看过」中选提名（可多选）…'
                : '从当年「看过」中选提名（可多选）…'}
        </Button>
        <NominationPickerDialog
          key={nominations.map((n) => n.movieId).join(',')}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          nominations={nominations}
          pool={award.pool ?? 'done'}
          onConfirm={confirmNominations}
        />
      </CardContent>
      )}
    </Card>
  )
}

export default function AwardsSection() {
  const { activeAwards, enabledOptional, toggleOptional, addCustomAward, removeCustomAward, toggleCustomAward, updateCustomAward, clearCustomAwards, setAllOptional, setAllClassic, setAllCustom, customAwards, year, setYear, career, setCareer, movies, setAwardOrder, clearResults, getResult, awardDescOverrides, setAwardDescription, awardMode, setAwardMode, topN, setTopN, topCategory, setTopCategory, topPicks } = useStore()
  const [customName, setCustomName] = useState('')
  const [descAwardId, setDescAwardId] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmScope, setConfirmScope] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [flashId, setFlashId] = useState<string | null>(null)
  const [topDragRank, setTopDragRank] = useState<number | null>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())

  /** 点击进度条色块：展开对应奖项（若折叠）并平滑滚动到卡片，金色高亮提示 */
  function jumpToAward(awardId: string) {
    setCollapsedIds((prev) => {
      if (!prev.has(awardId)) return prev
      const next = new Set(prev)
      next.delete(awardId)
      return next
    })
    window.setTimeout(() => {
      cardRefs.current.get(awardId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlashId(awardId)
      window.setTimeout(() => setFlashId((f) => (f === awardId ? null : f)), 1400)
    }, 80)
  }

  function toggleCollapse(awardId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(awardId)) next.delete(awardId)
      else next.add(awardId)
      return next
    })
  }

  function requestScope(key: string, apply: () => void) {
    if (confirmScope === key) {
      clearResults()
      apply()
      setConfirmScope(null)
      toast.success('已切换评选范围，并清空全部提名与获奖')
    } else {
      setConfirmScope(key)
      window.setTimeout(() => setConfirmScope((s) => (s === key ? null : s)), 4000)
    }
  }

  const allOptionalOn = OPTIONAL_AWARDS.every((a) => enabledOptional.includes(a.id))
  const allClassicOn = REQUIRED_AWARDS.every((a) => enabledOptional.includes(a.id))
  const allCustomOn = customAwards.length > 0 && customAwards.every((c) => c.enabled !== false)
  // 自定义奖项说明：下拉选择的目标奖项（失效时回退到第一个）
  const effectiveDescId = customAwards.some((c) => c.id === descAwardId) ? descAwardId : (customAwards[0]?.id ?? '')
  const descAward = customAwards.find((c) => c.id === effectiveDescId)
  // 必选 / 可选奖项说明覆盖：下拉选择的目标奖项（失效时回退到第一个）
  const [reqDescId, setReqDescId] = useState('')
  const [optDescId, setOptDescId] = useState('')
  const effectiveReqId = REQUIRED_AWARDS.some((a) => a.id === reqDescId) ? reqDescId : REQUIRED_AWARDS[0].id
  const reqAward = REQUIRED_AWARDS.find((a) => a.id === effectiveReqId) ?? REQUIRED_AWARDS[0]
  const effectiveOptId = OPTIONAL_AWARDS.some((a) => a.id === optDescId) ? optDescId : OPTIONAL_AWARDS[0].id
  const optAward = OPTIONAL_AWARDS.find((a) => a.id === effectiveOptId) ?? OPTIONAL_AWARDS[0]

  // 进度统计：与卡片状态徽标同一套判定
  const progress = activeAwards.reduce(
    (acc, a) => {
      const r = getResult(a.id)
      if (r.winnerTbd || r.winner?.movieId === TBD_ID) acc.winnerTbd += 1
      else if (r.nominations.some((n) => n.movieId === TBD_ID)) acc.nomTbd += 1
      else if (r.winner) acc.done += 1
      else acc.pending += 1
      return acc
    },
    { done: 0, winnerTbd: 0, nomTbd: 0, pending: 0 }
  )

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const m of movies) {
      const y = Number((m.markedAt || '').slice(0, 4))
      if (y > 1900) set.add(y)
    }
    set.add(year)
    return Array.from(set).sort((a, b) => b - a)
  }, [movies, year])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="font-bold">评选模式</h3>
          <span className="text-xs text-muted-foreground">
            {awardMode === 'oscars' ? '按奖项评选，生成私人奥斯卡海报' : '按排名评选 Top N 榜单，生成榜单图片'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={awardMode === 'oscars' ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1.5 text-sm"
            onClick={() => setAwardMode('oscars')}
          >
            奥斯卡
          </Badge>
          <Badge
            variant={awardMode === 'top' ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1.5 text-sm"
            onClick={() => setAwardMode('top')}
          >
            Top榜
          </Badge>
        </div>
        <div className="mt-3 border-t pt-3">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="font-bold">评选范围</h3>
          <span className="text-xs text-muted-foreground">
            {awardMode === 'top'
              ? 'Top 榜：从评选范围内的「看过」影片中按名次评选'
              : career
                ? '光影生涯：除「最期待」外，各奖项从全部「看过」影片中评选'
                : '年度模式：除「最期待」外，各奖项从该年度「看过」影片中评选'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={career ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1.5 text-sm"
            onClick={() => requestScope('career', () => setCareer(true))}
          >
            光影生涯
          </Badge>
          {years.map((y) => (
            <Badge
              key={y}
              variant={!career && year === y ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5 text-sm"
              onClick={() =>
                requestScope(`year-${y}`, () => {
                  setCareer(false)
                  setYear(y)
                })
              }
            >
              {y} 年
            </Badge>
          ))}
        </div>
        {confirmScope && (
          <p className="mt-2 text-xs font-medium text-orange-600">⚠ 切换评选范围将清空所有提名电影和已评奖项，请再次点击</p>
        )}
        {/* 评选进度总览：奥斯卡模式与状态徽标四态一致；Top 榜模式每名次一色块（已评出=深绿、待评选=无色） */}
        <div className="mt-3">
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            {awardMode === 'top'
              ? Array.from({ length: topN }, (_, i) => i + 1).map((rank) => (
                  <div
                    key={rank}
                    className="group relative flex-1 cursor-pointer border border-border/60 transition hover:opacity-80"
                    style={{ background: topPicks[String(rank)] ? '#007722' : 'transparent' }}
                    title={`Top ${rank}`}
                    onClick={() => jumpToAward(`top-${rank}`)}
                  >
                    <MousePointerClick className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 drop-shadow-[0_0_2px_rgba(0,0,0,0.9)] transition group-hover:opacity-100" />
                  </div>
                ))
              : activeAwards.map((a) => {
                  const r = getResult(a.id)
                  let bg: string
                  if (r.winnerTbd || r.winner?.movieId === TBD_ID) bg = '#4da36b'
                  else if (r.nominations.some((n) => n.movieId === TBD_ID)) bg = '#9ccbab'
                  else if (r.winner) bg = '#007722'
                  else bg = 'transparent'
                  return (
                    <div
                      key={a.id}
                      className="group relative flex-1 cursor-pointer border border-border/60 transition hover:opacity-80"
                      style={{ background: bg }}
                      title={a.name}
                      onClick={() => jumpToAward(a.id)}
                    >
                      <MousePointerClick className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 drop-shadow-[0_0_2px_rgba(0,0,0,0.9)] transition group-hover:opacity-100" />
                    </div>
                  )
                })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {awardMode === 'top' ? (
              <>
                已评出 <b className="text-[#007722]">{Array.from({ length: topN }, (_, i) => i + 1).filter((r) => topPicks[String(r)]).length}</b> · 待评选{' '}
                {Array.from({ length: topN }, (_, i) => i + 1).filter((r) => !topPicks[String(r)]).length}（共 {topN} 个名次）
              </>
            ) : (
              <>
                已评出 <b className="text-[#007722]">{progress.done}</b> · 获奖未定 {progress.winnerTbd} · 提名未定 {progress.nomTbd} · 待评选{' '}
                {progress.pending}（共 {activeAwards.length} 个奖项）
              </>
            )}
          </p>
        </div>
        </div>
      </div>
      {awardMode === 'top' && (
        <div className="space-y-3 rounded-md border bg-card p-4">
          <h3 className="font-bold">Top 榜评选</h3>
          {/* Top N：预设 5 / 10 / 20 + 自定义数量 */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-sm font-bold">Top N</span>
            <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
              {([5, 10, 20] as const).map((n) => (
                <button
                  key={n}
                  className={`rounded px-2.5 py-1 transition ${topN === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setTopN(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              max={99}
              className="max-w-[150px]"
              placeholder={`自定义 N（当前 ${topN}）`}
              value={[5, 10, 20].includes(topN) ? '' : topN}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value))
                if (n > 0) setTopN(Math.min(n, 99))
              }}
            />
          </div>
          {/* Top 类别：预设类别 + 自定义类别 */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-sm font-bold">Top 类别</span>
            <div className="flex flex-wrap items-center gap-1 rounded-md border p-0.5 text-sm">
              {TOP_CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`rounded px-2.5 py-1 transition ${topCategory === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setTopCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <Input
              className="max-w-xs"
              placeholder="自定义类别（如：纪录片）"
              value={TOP_CATEGORIES.includes(topCategory) ? '' : topCategory}
              onChange={(e) => setTopCategory(e.target.value)}
            />
          </div>
        </div>
      )}
      {awardMode === 'top' && (
        <>
          <div className="text-center">
            <h3 className="text-lg font-bold">
              {career ? '光影生涯' : `${year} 年`} {topCategory} Top {topN}
            </h3>
          </div>
          <div className="space-y-4">
            {Array.from({ length: topN }, (_, i) => i + 1).map((rank) => (
              <div
                key={rank}
                ref={(el) => {
                  if (el) cardRefs.current.set(`top-${rank}`, el)
                  else cardRefs.current.delete(`top-${rank}`)
                }}
                className={`relative flex scroll-mt-20 items-start gap-2 ${flashId === `top-${rank}` ? 'animate-[card-flash_1.2s_ease-out]' : ''} ${topDragRank === rank ? 'opacity-40' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(rank))
                      e.dataTransfer.effectAllowed = 'move'
                      setTopDragRank(rank)
                    }}
                    onDragEnd={() => setTopDragRank(null)}
                    className="mt-4 cursor-grab text-muted-foreground transition hover:text-primary active:cursor-grabbing"
                    title="拖拽调整名次：拖到另一名次，两部电影交换位置"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <button
                    className="mt-1 text-muted-foreground transition hover:text-primary"
                    title={collapsedIds.has(`top-${rank}`) ? '展开名次' : '折叠名次'}
                    onClick={() => toggleCollapse(`top-${rank}`)}
                  >
                    {collapsedIds.has(`top-${rank}`) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex-1">
                  <TopCard rank={rank} collapsed={collapsedIds.has(`top-${rank}`)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {awardMode === 'oscars' && (
      <>
      <div className="rounded-md border bg-card p-4">
        {/* 传统奖项：默认开启，可整体或单独开关 */}
        <div className="mb-3 flex items-center gap-3">
          <h3 className="font-bold">传统奖项</h3>
          <label className="flex cursor-pointer items-center gap-1">
            <Switch className="scale-[0.8]" checked={allClassicOn} onCheckedChange={(v) => setAllClassic(!!v)} />
            <span className="text-xs text-muted-foreground">开启全部传统奖项</span>
          </label>
          <span className="text-xs text-muted-foreground">{REQUIRED_AWARDS.length} 项默认开启</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {REQUIRED_AWARDS.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch checked={enabledOptional.includes(a.id)} onCheckedChange={() => toggleOptional(a.id)} />
              {a.name}
            </label>
          ))}
        </div>
        {/* 必选奖项说明：下拉选择奖项 + 修改说明（留空恢复默认），实时保存 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className="h-9 max-w-xs rounded-md border bg-background px-2 text-sm"
            value={effectiveReqId}
            onChange={(e) => setReqDescId(e.target.value)}
          >
            {REQUIRED_AWARDS.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <Input
            className="max-w-md"
            placeholder={`默认：${reqAward.description}`}
            value={awardDescOverrides[effectiveReqId] ?? ''}
            onChange={(e) => setAwardDescription(effectiveReqId, e.target.value)}
          />
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="mb-3 flex items-center gap-3">
            <h3 className="font-bold">可选奖项</h3>
            <label className="flex cursor-pointer items-center gap-1">
              <Switch className="scale-[0.8]" checked={allOptionalOn} onCheckedChange={(v) => setAllOptional(!!v)} />
              <span className="text-xs text-muted-foreground">开启全部可选奖项</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {ORDERED_OPTIONAL_AWARDS.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={enabledOptional.includes(a.id)} onCheckedChange={() => toggleOptional(a.id)} />
                {a.name}
              </label>
            ))}
          </div>
          {/* 可选奖项说明：下拉选择奖项 + 修改说明（留空恢复默认），实时保存 */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className="h-9 max-w-xs rounded-md border bg-background px-2 text-sm"
              value={effectiveOptId}
              onChange={(e) => setOptDescId(e.target.value)}
            >
              {ORDERED_OPTIONAL_AWARDS.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <Input
              className="max-w-md"
              placeholder={`默认：${optAward.description}`}
              value={awardDescOverrides[effectiveOptId] ?? ''}
              onChange={(e) => setAwardDescription(effectiveOptId, e.target.value)}
            />
          </div>
        </div>

        {/* 自定义奖项：开关 + 删除 */}
        {customAwards.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="font-bold">自定义奖项</div>
              <label className={`flex items-center gap-1 ${customAwards.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <Switch
                  className="scale-[0.8]"
                  checked={allCustomOn}
                  disabled={customAwards.length === 0}
                  onCheckedChange={(v) => setAllCustom(!!v)}
                />
                <span className="text-xs text-muted-foreground">开启全部自定义奖项</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {customAwards.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 text-sm">
                  <Switch checked={c.enabled !== false} onCheckedChange={() => toggleCustomAward(c.id)} />
                  <span className={c.enabled === false ? 'text-muted-foreground line-through' : ''}>{c.name}</span>
                  <button
                    className="text-muted-foreground transition hover:text-destructive"
                    title="删除该奖项"
                    onClick={() => removeCustomAward(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Input
            className="max-w-xs"
            placeholder="自定义奖项名称（如：最佳群戏）"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => {
              if (!customName.trim()) return
              addCustomAward(customName.trim())
              setCustomName('')
            }}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" /> 添加奖项
          </Button>
          <Button
            variant="outline"
            className={confirmDeleteAll ? 'border-destructive text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-destructive'}
            disabled={customAwards.length === 0 && !confirmDeleteAll}
            onClick={() => {
              if (confirmDeleteAll) {
                clearCustomAwards()
                setConfirmDeleteAll(false)
                toast.success('已删除全部自定义奖项')
              } else {
                setConfirmDeleteAll(true)
                window.setTimeout(() => setConfirmDeleteAll(false), 3500)
              }
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> {confirmDeleteAll ? '真的吗？请再次点击' : '删除全部自定义奖项'}
          </Button>
        </div>

        {/* 自定义奖项说明：下拉选择奖项 + 输入说明，实时保存 */}
        {customAwards.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className="h-9 max-w-xs rounded-md border bg-background px-2 text-sm"
              value={effectiveDescId}
              onChange={(e) => setDescAwardId(e.target.value)}
            >
              {customAwards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Input
              className="max-w-md"
              placeholder="自定义奖项说明（如：群戏最出彩的片子）"
              value={descAward?.description ?? ''}
              onChange={(e) => updateCustomAward(effectiveDescId, { description: e.target.value })}
            />
          </div>
        )}

        {/* 操作按钮区 */}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            className={confirmClear ? 'border-destructive text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-destructive'}
            onClick={() => {
              if (confirmClear) {
                clearResults()
                setConfirmClear(false)
                toast.success('已清空全部提名与获奖')
              } else {
                setConfirmClear(true)
                window.setTimeout(() => setConfirmClear(false), 3500)
              }
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> {confirmClear ? '真的吗？请再次点击' : '清空提名和已评奖项'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setAwardOrder([])
              toast.success('已恢复默认排序')
            }}
          >
            <GripVertical className="mr-1.5 h-4 w-4" /> 恢复默认排序
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              const allCollapsed = activeAwards.every((a) => collapsedIds.has(a.id))
              setCollapsedIds(allCollapsed ? new Set() : new Set(activeAwards.map((a) => a.id)))
            }}
          >
            {activeAwards.every((a) => collapsedIds.has(a.id)) ? (
              <ChevronDown className="mr-1.5 h-4 w-4" />
            ) : (
              <ChevronUp className="mr-1.5 h-4 w-4" />
            )}
            {activeAwards.every((a) => collapsedIds.has(a.id)) ? '全部展开' : '全部折叠'}
          </Button>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold">
          {career ? '光影生涯奥斯卡' : `${year} 年私人奥斯卡`} · 共 {activeAwards.length} 个奖项
        </h3>
      </div>

      <div className="space-y-4">
        {activeAwards.map((a) => (
          <div
            key={a.id}
            ref={(el) => {
              if (el) cardRefs.current.set(a.id, el)
              else cardRefs.current.delete(a.id)
            }}
            className={`relative flex scroll-mt-20 items-start gap-2 ${dragId === a.id ? 'opacity-40' : ''} ${overId === a.id && dragId !== a.id ? 'rounded-md ring-2 ring-primary' : ''} ${flashId === a.id ? 'animate-[card-flash_1.2s_ease-out]' : ''}`}
            draggable
            onDragStart={(e) => {
              setDragId(a.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {
              setDragId(null)
              setOverId(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setOverId(a.id)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragId && dragId !== a.id) {
                const ids = activeAwards.map((x) => x.id)
                const from = ids.indexOf(dragId)
                const to = ids.indexOf(a.id)
                ids.splice(from, 1)
                ids.splice(to, 0, dragId)
                setAwardOrder(ids)
              }
              setDragId(null)
              setOverId(null)
            }}
          >
            <div className="flex flex-col items-center">
              <span className="mt-4 cursor-grab select-none text-muted-foreground active:cursor-grabbing" title="拖拽排序">
                <GripVertical className="h-4 w-4" />
              </span>
              <button
                className="mt-1 text-muted-foreground transition hover:text-primary"
                title={collapsedIds.has(a.id) ? '展开奖项' : '折叠奖项'}
                onClick={() => toggleCollapse(a.id)}
              >
                {collapsedIds.has(a.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex-1">
              <AwardCard award={a} collapsed={collapsedIds.has(a.id)} />
            </div>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  )
}
