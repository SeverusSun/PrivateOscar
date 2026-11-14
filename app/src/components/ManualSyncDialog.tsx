import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store'
import { enrichDetails, searchDoubanMovies, searchResultToEntry, type DoubanSearchResult } from '@/lib/douban'
import { proxiedImage } from '@/lib/storage'

/**
 * 手动同步电影词条浮窗：从豆瓣网页搜索补录未同步的影片。
 * 三行布局：① 搜索框 + 预览/同步按钮（无结果时为「预览」，有结果时为「同步」）
 *           ② 全选；③ 词条展示区（已在影库的条目置灰不可选）
 * 影库界面与评选/Top 榜的选择影片浮窗共用，后者可传入 initialQuery 预填搜索词。
 */
export default function ManualSyncDialog({
  open,
  onClose,
  initialQuery = '',
}: {
  open: boolean
  onClose: () => void
  initialQuery?: string
}) {
  const { movies, addMovies } = useStore()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<DoubanSearchResult[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  // 当前展示区结果对应的搜索词：搜索词被修改后结果视为过期，按钮回到「预览」
  const [resultsFor, setResultsFor] = useState('')

  // 打开时预填搜索词、清空上一次的展示
  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setResults([])
      setChecked(new Set())
      setResultsFor('')
    }
  }, [open, initialQuery])

  const libraryIds = useMemo(() => new Set(movies.map((m) => m.id)), [movies])
  const selectable = useMemo(() => results.filter((r) => !libraryIds.has(r.id)), [results, libraryIds])
  const allChecked = selectable.length > 0 && selectable.every((r) => checked.has(r.id))
  // 搜索词与结果来源一致时才视为「有结果」（可同步）；改过搜索词则回到预览态
  const hasResults = results.length > 0 && query.trim() === resultsFor

  const preview = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    try {
      const list = await searchDoubanMovies(q)
      setResults(list)
      setResultsFor(q)
      setChecked(new Set())
      if (list.length === 0) toast.info('豆瓣没有找到相关词条')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '搜索失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const sync = async () => {
    const picked = results.filter((r) => checked.has(r.id) && !libraryIds.has(r.id))
    if (!picked.length) return
    setSyncing(true)
    try {
      const entries = picked.map(searchResultToEntry)
      // 补全导演/演员/简介：人物奖项自动匹配与导演筛选依赖这些数据
      await enrichDetails(entries, 4)
      addMovies(entries)
      toast.success(`已同步 ${entries.length} 部到影库`)
      setChecked(new Set())
    } catch {
      toast.error('同步失败，请稍后重试')
    } finally {
      setSyncing(false)
    }
  }

  const toggleAll = (on: boolean) => setChecked(on ? new Set(selectable.map((r) => r.id)) : new Set())
  const toggle = (id: string) =>
    setChecked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-xl">
        <DialogHeader>
          <DialogTitle>手动同步电影词条</DialogTitle>
        </DialogHeader>
        {/* 第一行：搜索 + 预览/同步 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索片名/导演"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !hasResults) preview()
              }}
            />
          </div>
          <Button
            disabled={loading || syncing || (!hasResults && !query.trim()) || (hasResults && checked.size === 0)}
            onClick={hasResults ? sync : preview}
          >
            {(loading || syncing) && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {hasResults ? '同步' : '预览'}
          </Button>
        </div>
        {/* 第二行：全选 */}
        <div className="flex items-center gap-2 text-sm">
          <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} disabled={!selectable.length} />
          <span className="text-muted-foreground">全选{selectable.length > 0 && `（可同步 ${selectable.length} 部）`}</span>
        </div>
        {/* 第三行：词条展示区 */}
        <div className="max-h-[45vh] space-y-0.5 overflow-y-auto rounded-md border p-2">
          {!hasResults && !loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">输入片名或导演名，点「预览」从豆瓣检索</div>
          )}
          {results.map((r) => {
            const inLib = libraryIds.has(r.id)
            return (
              <label
                key={r.id}
                className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm ${inLib ? 'opacity-50' : 'cursor-pointer hover:bg-muted'}`}
              >
                <Checkbox disabled={inLib} checked={checked.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                <img
                  src={r.poster ? proxiedImage(r.poster) : ''}
                  alt={r.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-11 w-8 shrink-0 rounded-sm object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.title}
                    {r.year ? ` (${r.year})` : ''}
                    {inLib && <span className="ml-1 text-[11px] text-muted-foreground">（已在影库）</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{r.subtitle || '　'}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-[#e09015]">{r.doubanRating?.toFixed(1) ?? '—'}</span>
              </label>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
