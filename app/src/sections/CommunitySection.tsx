import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, Heart, Loader2, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { communityApi, type CommunityPoster } from '@/lib/communityApi'
import { useCommunityAuth } from '@/lib/communityAuthContext'
import CommunityRankings from '@/components/CommunityRankings'
import CommunityAccountControls from '@/components/CommunityAccountControls'
import { TOP_CATEGORIES } from '@/data/topCategories'
import type { PosterType } from '@/shared/selection'

const selectClass = 'h-9 min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function scopeLabel(poster: CommunityPoster): string {
  if (poster.selection.scopeType === 'career') return '光影生涯'
  return `${poster.selection.scopeYear}${poster.selection.scopeType === 'release' ? ' 上映' : ' 标记'}`
}

function posterTypeLabel(type: PosterType): string {
  return type === 'oscar' ? '奥斯卡海报' : type === 'nominations' ? '提名名单' : 'Top 榜'
}

export default function CommunitySection() {
  const { user, openAuth } = useCommunityAuth()
  const [view, setView] = useState<'posters' | 'rankings'>('posters')
  const [posterType, setPosterType] = useState('')
  const [scope, setScope] = useState('')
  const [scopeYear, setScopeYear] = useState('')
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [topCategory, setTopCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [ownerInput, setOwnerInput] = useState('')
  const [ownerQuery, setOwnerQuery] = useState('')
  const [mine, setMine] = useState(false)
  const [sort, setSort] = useState('likes')
  const [page, setPage] = useState(1)
  const [posters, setPosters] = useState<CommunityPoster[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(12)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<CommunityPoster | null>(null)
  const [liking, setLiking] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [siteStats, setSiteStats] = useState<{ visitorCount: number; exportCounts: Record<PosterType, number> } | null>(null)

  const categoryKey = topCategory === 'custom' ? (customCategory.trim() ? `custom:${encodeURIComponent(customCategory.trim())}` : '') : topCategory
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await communityApi.posters({
        posterType: posterType || undefined,
        scope: scope || undefined,
        scopeYear: scopeYear ? Number(scopeYear) : undefined,
        topCategoryKey: posterType === 'top' ? categoryKey || undefined : undefined,
        owner: ownerQuery || undefined,
        mine: mine ? '1' : undefined,
        sort, page, pageSize: 12,
      })
      setPosters(result.items)
      setTotal(result.total)
      setPageSize(result.pageSize)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [posterType, scope, scopeYear, categoryKey, ownerQuery, mine, sort, page])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (!user) setMine(false) }, [user])
  useEffect(() => { communityApi.siteStats().then(setSiteStats).catch(() => setSiteStats(null)) }, [])
  useEffect(() => {
    setAvailableYears([])
    if (scope !== 'marked' && scope !== 'release') return
    let active = true
    void communityApi.posterYears(scope)
      .then((result) => { if (active) setAvailableYears(result.years) })
      .catch(() => undefined)
    return () => { active = false }
  }, [scope])

  function resetPage() { setPage(1) }

  async function toggleLike(poster: CommunityPoster) {
    if (!user) { openAuth(); return }
    setLiking(poster.pictureId)
    try {
      const result = await communityApi.like(poster.pictureId, poster.likedByMe)
      const update = (item: CommunityPoster) => item.pictureId === poster.pictureId
        ? { ...item, likedByMe: result.liked, likeCount: result.likeCount }
        : item
      setPosters((items) => items.map(update))
      setSelected((item) => item ? update(item) : null)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '点赞失败')
    } finally {
      setLiking('')
    }
  }

  async function deleteSelection() {
    if (!selected) return
    setDeleting(true)
    try {
      await communityApi.deleteSelection(selected.selection.selectionId)
      toast.success('已删除该评选及其关联海报')
      setSelected(null)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4">
      <section className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#1b4332]"><UsersRound className="h-6 w-6" />人人奥斯卡</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">看见彼此的电影选择。只有主动上传的海报和评选才会公开展示。</p>
          {siteStats && <p className="mt-2 text-xs leading-5 text-muted-foreground">累计访客 {siteStats.visitorCount} · 海报导出 {siteStats.exportCounts.oscar} · 名单导出 {siteStats.exportCounts.nominations} · Top 导出 {siteStats.exportCounts.top}</p>}
        </div>
        <CommunityAccountControls />
      </section>

      <nav className="flex gap-1 border-b" aria-label="人人奥斯卡子页面">
        <button className={`min-h-11 cursor-pointer border-b-2 px-4 text-sm font-medium transition ${view === 'posters' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => setView('posters')} aria-pressed={view === 'posters'}>海报展示</button>
        <button className={`min-h-11 cursor-pointer border-b-2 px-4 text-sm font-medium transition ${view === 'rankings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => { setSelected(null); setView('rankings') }} aria-pressed={view === 'rankings'}>众人所评</button>
      </nav>

      <div className={view === 'posters' ? 'contents' : 'hidden'}>
      <section aria-label="海报筛选" className="space-y-4 rounded-md border bg-card p-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="community-poster-type">照片类别</Label>
              <select id="community-poster-type" className={`${selectClass} w-full`} value={posterType} onChange={(event) => { setPosterType(event.target.value); setTopCategory(''); resetPage() }}>
                <option value="">全部类别</option><option value="oscar">奥斯卡海报</option><option value="nominations">奥斯卡提名名单</option><option value="top">Top 榜</option>
              </select>
            </div>
            {posterType === 'top' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="community-top-category">Top 类别</Label>
                  <select id="community-top-category" className={`${selectClass} w-full`} value={topCategory} onChange={(event) => { setTopCategory(event.target.value); resetPage() }}>
                    <option value="">全部 Top 类别</option>
                    {TOP_CATEGORIES.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                    <option value="custom">自定义类别</option>
                  </select>
                </div>
                {topCategory === 'custom' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="community-custom-category">自定义类别名称</Label>
                    <Input id="community-custom-category" value={customCategory} onChange={(event) => { setCustomCategory(event.target.value); resetPage() }} placeholder="输入上传时使用的完整类别名" />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="community-scope">评选范围</Label>
              <select id="community-scope" className={`${selectClass} w-full`} value={scope} onChange={(event) => { setScope(event.target.value); setScopeYear(''); resetPage() }}>
                <option value="">全部范围</option><option value="career">光影生涯</option><option value="marked">标记年份</option><option value="release">上映年份</option>
              </select>
            </div>
            {(scope === 'marked' || scope === 'release') && (
              <div className="space-y-1.5">
                <Label htmlFor="community-scope-year">年份</Label>
                <select id="community-scope-year" className={`${selectClass} w-full`} value={scopeYear} onChange={(event) => { setScopeYear(event.target.value); resetPage() }}>
                  <option value="">全部年份</option>
                  {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="community-sort">排序方式</Label>
              <select id="community-sort" className={`${selectClass} w-full`} value={sort} onChange={(event) => { setSort(event.target.value); resetPage() }}>
                <option value="likes">点赞量</option><option value="uploaded-desc">上传时间倒序</option><option value="uploaded-asc">上传时间正序</option>
              </select>
            </div>
          </div>
        </div>
        <form className="space-y-1.5" onSubmit={(event) => { event.preventDefault(); setOwnerQuery(ownerInput.trim()); resetPage() }}>
          <Label htmlFor="community-owner-search">豆瓣用户 UID / 显示名</Label>
          <div className="flex gap-2">
            <Input id="community-owner-search" className="min-w-0 flex-1" value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} placeholder="UID 精确检索，或输入部分显示名" maxLength={100} />
            <Button type="submit" variant="secondary" className="shrink-0">搜索</Button>
          </div>
          <p className="text-xs text-muted-foreground">UID 需完整匹配；显示名支持模糊搜索。清空内容后点击搜索可显示全部用户。</p>
        </form>
        <div className="flex min-h-9 items-center gap-2 border-t pt-3">
          <Switch id="community-mine" checked={mine} onCheckedChange={(checked) => { if (checked && !user) { openAuth(); return }; setMine(checked); resetPage() }} />
          <Label htmlFor="community-mine" className="cursor-pointer">我的上传</Label>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />正在加载海报</div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 p-8 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>重新加载</Button></div>
      ) : posters.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">暂时没有符合条件的海报。导出海报后，可主动上传到人人奥斯卡。</div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {posters.map((poster) => (
            <article key={poster.pictureId} className="mb-4 break-inside-avoid overflow-hidden rounded-md border bg-card">
              <button className="block w-full cursor-zoom-in bg-[#e5e5dd]" onClick={() => setSelected(poster)} aria-label={`查看${posterTypeLabel(poster.posterType)}原图`}>
                <img
                  src={poster.thumbnailUrl}
                  alt={`${poster.selection.ownerName}的${posterTypeLabel(poster.posterType)}`}
                  width={poster.width}
                  height={poster.height}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full object-cover"
                />
              </button>
              <div className="space-y-3 p-3">
                <div>
                  <p className="truncate font-medium">{poster.selection.ownerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{posterTypeLabel(poster.posterType)} · {scopeLabel(poster)}{poster.selection.topCategoryName ? ` · ${poster.selection.topCategoryName}` : ''}</p>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant={poster.likedByMe ? 'default' : 'outline'} size="sm" onClick={() => void toggleLike(poster)} disabled={liking === poster.pictureId} aria-label={poster.likedByMe ? '取消点赞' : '点赞'}>
                    {liking === poster.pictureId ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Heart className={`mr-1 h-4 w-4 ${poster.likedByMe ? 'fill-current' : ''}`} />}{poster.likeCount}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { void navigator.clipboard.writeText(poster.pictureId); toast.success('图片 UUID 已复制') }} title={`图片 UUID：${poster.pictureId}`}><Copy className="mr-1 h-3.5 w-3.5" />UUID</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {total > pageSize && (
        <nav className="flex items-center justify-center gap-4" aria-label="海报分页">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground">第 {page} / {totalPages} 页，共 {total} 张</span>
          <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>下一页</Button>
        </nav>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.selection.ownerName} · {posterTypeLabel(selected.posterType)}</DialogTitle>
                <DialogDescription>{scopeLabel(selected)}{selected.selection.topCategoryName ? ` · ${selected.selection.topCategoryName}` : ''} · 上传于 {new Date(selected.uploadedAt).toLocaleString('zh-CN')}</DialogDescription>
              </DialogHeader>
              <img src={selected.imageUrl} alt="完整上传海报" className="mx-auto max-h-[65vh] w-auto max-w-full object-contain" />
              <p className="break-all text-xs text-muted-foreground">图片 UUID：{selected.pictureId}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={selected.likedByMe ? 'default' : 'outline'} onClick={() => void toggleLike(selected)} disabled={liking === selected.pictureId}><Heart className={`mr-2 h-4 w-4 ${selected.likedByMe ? 'fill-current' : ''}`} />{selected.likeCount} 个点赞</Button>
                <Button variant="outline" asChild><a href={selected.imageUrl} download={`${selected.pictureId}.jpg`}><Download className="mr-2 h-4 w-4" />下载原图</a></Button>
                {mine && user && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive">删除我的评选</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>删除这份评选？</AlertDialogTitle><AlertDialogDescription>将删除该评选关联的全部海报、结构化数据和点赞，且无法恢复。</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => void deleteSelection()} disabled={deleting}>{deleting ? '正在删除' : '确认删除'}</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
      {view === 'rankings' && <CommunityRankings />}
    </div>
  )
}
