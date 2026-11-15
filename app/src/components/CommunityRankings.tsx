import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Medal, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { communityApi, type SelectionStatsGroup } from '@/lib/communityApi'
import { AWARDS } from '@/data/awards'
import { TOP_CATEGORIES } from '@/data/topCategories'

export default function CommunityRankings() {
  const [mode, setMode] = useState<'oscars' | 'top'>('oscars')
  const [groups, setGroups] = useState<SelectionStatsGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await communityApi.selectionStats(mode)
      setGroups(result.groups)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '统计加载失败')
    } finally {
      setLoading(false)
    }
  }, [mode])
  useEffect(() => { void load() }, [load])

  const orderedGroups = useMemo(() => {
    const byId = new Map(groups.map((group) => [group.id, group]))
    if (mode === 'oscars') {
      const builtIn = AWARDS.map((award) => ({
        id: award.id, name: award.name, required: award.required,
        entries: byId.get(award.id)?.entries ?? [],
      }))
      const custom = groups.filter((group) => !AWARDS.some((award) => award.id === group.id)).map((group) => ({ ...group, required: false }))
      return [...builtIn, ...custom]
    }
    const builtIn = TOP_CATEGORIES.map(([id, name]) => ({ id, name, required: false, entries: byId.get(id)?.entries ?? [] }))
    const custom = groups.filter((group) => !TOP_CATEGORIES.some(([id]) => id === group.id)).map((group) => ({ ...group, required: false }))
    return [...builtIn, ...custom]
  }, [groups, mode])

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#1b4332]">众人所评</h3>
          <p className="mt-1 text-sm text-muted-foreground">按最终获奖与 Top 入榜统计，每个奖项或类别固定展示前十名。</p>
        </div>
        <div className="flex rounded-md border p-1" aria-label="统计模式">
          <Button variant={mode === 'oscars' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('oscars')}><Trophy className="mr-1.5 h-4 w-4" />奥斯卡</Button>
          <Button variant={mode === 'top' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('top')}><Medal className="mr-1.5 h-4 w-4" />Top 榜</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />正在汇总评选</div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 p-8 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>重新加载</Button></div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {orderedGroups.map((group) => (
            <article key={group.id} className="rounded-md border bg-card">
              <header className="flex items-center justify-between border-b px-4 py-3">
                <h4 className="font-bold">{group.name}</h4>
                <span className="text-xs text-muted-foreground">{mode === 'oscars' ? (group.required ? '传统奖项' : '可选 / 自定义') : 'Top 类别'} · Top 10</span>
              </header>
              {group.entries.length ? (
                <ol className="divide-y">
                  {group.entries.map((entry, index) => (
                    <li key={`${entry.movieId}-${entry.personName ?? ''}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className={`w-6 text-center font-serif font-bold ${index < 3 ? 'text-[#9b7b12]' : 'text-muted-foreground'}`}>{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate" title={entry.personName ? `${entry.personName} · ${entry.title}` : entry.title}>
                        {entry.personName && <span className="font-medium">{entry.personName} · </span>}{entry.title}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-[#1b4332]">{entry.count} 次</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="px-4 py-6 text-center text-sm text-muted-foreground">暂无评选记录</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
