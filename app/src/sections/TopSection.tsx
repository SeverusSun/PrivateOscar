import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store'
import { proxiedImage } from '@/lib/storage'
import { resolvePerson, useCreditsLoader } from '@/lib/persons'
import oscarUrl from '@/assets/oscar.png'
import type { AwardDef } from '@/types'

const GOLD = '#c9a227'
const RATING_ORANGE = '#e09015'
/** 榜单标题：书法体（与奥斯卡海报一致） */
const TITLE_FONT = '"KaiTi", "STKaiti", "KaiTi SC", "楷体", "Noto Serif SC", serif'

/** Top 榜「导演」类别的合成奖项定义：复用 resolvePerson 的导演照片自动匹配 */
const TOP_DIRECTOR_AWARD: AwardDef = { id: 'top-director', name: '导演 Top', description: '', required: false, kind: 'manual' }

/** 海报内使用的星级显示（未评分显示五颗描边星） */
function StarRow({ value, size = 14 }: { value: number | null; size?: number }) {
  const filled = value == null ? 0 : Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < filled ? RATING_ORANGE : 'none'} stroke={RATING_ORANGE} strokeWidth="1.5">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
      ))}
    </span>
  )
}

/** 榜单海报：报头 + Top 1 ~ N 排名行（海报宽度 1080，高度随名次数量变化） */
function TopPoster({ showAvatar, showOscar, medal, customTitle, customSubtitle }: { showAvatar: boolean; showOscar: boolean; medal: boolean; customTitle?: string; customSubtitle?: string }) {
  const { profile, year, career, topN, topCategory, topPicks, movieById } = useStore()
  const isDirector = topCategory === '导演'
  const heading =
    customTitle?.trim() ||
    `${profile?.name ? profile.name + ' ' : ''}${career ? '光影生涯' : year} ${topCategory} Top ${topN}`
  const subtitle = customSubtitle?.trim() || `PERSONAL TOP ${topN}`
  const ranks = Array.from({ length: topN }, (_, i) => i + 1)
  // 懒加载入选影片的演职员数据，供导演类别自动匹配照片
  useCreditsLoader(isDirector ? ranks.map((r) => topPicks[String(r)]?.movieId).filter((id): id is string => !!id) : [])
  return (
    <div
      id="top-poster"
      className="bg-[#f6f6f0] px-12 py-8"
      style={{ width: 1080, fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
    >
      {/* 报头：小金人（可关） + 标题/副标题 + 豆瓣头像；关闭时用等宽占位保持标题居中 */}
      <div className="flex items-center justify-between">
        {showOscar ? (
          <img src={oscarUrl} alt="奥斯卡小金人" style={{ width: 36 }} crossOrigin="anonymous" />
        ) : (
          <div style={{ width: 22 }} />
        )}
        <div className="flex-1 text-center">
          <div className="text-[16px] tracking-[0.35em] text-[#6b7280]">{subtitle}</div>
          <div className="mt-1 text-[46px] font-bold tracking-wide text-[#111827]" style={{ fontFamily: TITLE_FONT }}>
            {heading}
          </div>
        </div>
        {showAvatar && profile?.avatar ? (
          <img
            src={proxiedImage(profile.avatar)}
            alt={profile.name}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{ width: 104, height: 104, borderRadius: '50%', border: '3px solid #c9a227', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: 104 }} />
        )}
      </div>
      <div className="mx-auto mt-3 h-px w-4/5 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent" />

      {/* 排名行 */}
      <div className="mt-8 space-y-5">
        {ranks.map((rank) => {
          const pick = topPicks[String(rank)]
          const movie = pick ? movieById(pick.movieId) : undefined
          const resolved = isDirector && movie && pick ? resolvePerson(TOP_DIRECTOR_AWARD, { movieId: movie.id, person: pick.person }, movie) : null
          const citation = pick ? (pick.citation?.trim() || movie?.shortComment.trim() || '') : ''
          // 前三名金银铜色调（可开关），关闭后所有名次统一烫金色
          const rankColor = medal ? (rank === 1 ? GOLD : rank === 2 ? '#9aa3ad' : rank === 3 ? '#b0793a' : GOLD) : GOLD
          const medalBg = medal ? (rank === 1 ? 'rgba(201,162,39,0.10)' : rank === 2 ? 'rgba(154,163,173,0.12)' : rank === 3 ? 'rgba(176,121,58,0.10)' : undefined) : undefined
          return (
            <div
              key={rank}
              className="flex items-center justify-center gap-5 rounded-sm border-b border-dashed border-[#d8d8cc] px-2 pb-3"
              style={medalBg ? { background: medalBg } : undefined}
            >
              {movie ? (
                <div className="flex items-center gap-3 overflow-hidden rounded-sm bg-[#ecece2] shadow-sm" style={{ width: 132, height: 198 }}>
                  {resolved?.image ? (
                    <img
                      src={resolved.manual ? resolved.image : proxiedImage(resolved.image)}
                      alt={resolved.name || movie.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      style={{ width: 132, height: 198, objectFit: 'cover' }}
                    />
                  ) : movie.poster ? (
                    <img
                      src={proxiedImage(movie.poster)}
                      alt={movie.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      style={{ width: 132, height: 198, objectFit: 'cover' }}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-sm border border-dashed border-[#c9c9bc] text-[14px] text-[#9ca3af]" style={{ width: 132, height: 198 }}>
                  待定
                </div>
              )}
              <div className="min-w-0 max-w-[440px] text-center">
                <div className="text-[20px] font-bold leading-tight" style={{ color: rankColor, fontFamily: TITLE_FONT }}>
                  TOP {rank}
                </div>
                {movie ? (
                  <>
                    <div className="mt-1 truncate text-[22px] font-bold text-[#111827]">
                      {resolved?.name ? `${resolved.name} ` : ''}
                      《{movie.title}》
                    </div>
                    <div className="mt-0.5 truncate text-[15px] text-[#4b5563]">
                      {isDirector ? movie.year : movie.directors.map((d) => d.name).join(' / ')}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-2 text-[15px] text-[#4b5563]">
                      豆瓣 <b style={{ color: RATING_ORANGE }}>{movie.doubanRating?.toFixed(1) ?? '—'}</b>
                      <StarRow value={movie.userRating ?? null} size={16} />
                    </div>
                  </>
                ) : (
                  <div className="text-[18px] text-[#9ca3af]">—</div>
                )}
              </div>
              {/* 右侧：颁奖词（固定占位，保证各行对齐） */}
              <div className="w-64 shrink-0 pt-0.5 text-center text-[16px] italic leading-relaxed text-[#6b7280]">
                {citation ? `“${citation}”` : ''}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center text-[12px] tracking-widest text-[#9ca3af]">
        — {new Date().toISOString().slice(0, 10)} · 由「私人奥斯卡」生成 —
      </div>
    </div>
  )
}

export default function TopSection() {
  const { profile, year, career, topN, topCategory } = useStore()
  const [exporting, setExporting] = useState(false)
  const [ratio, setRatio] = useState<1 | 2 | 3>(2)
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [customTitle, setCustomTitle] = useState(() => localStorage.getItem('top-custom-title') ?? '')
  const [customSubtitle, setCustomSubtitle] = useState(() => localStorage.getItem('top-custom-subtitle') ?? '')
  const [showAvatar, setShowAvatar] = useState(() => localStorage.getItem('poster-show-avatar') === '1')
  const [showOscar, setShowOscar] = useState(() => localStorage.getItem('poster-show-oscar') !== '0')
  const [medal, setMedal] = useState(() => localStorage.getItem('top-show-medal') !== '0')
  const previewRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(1000)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const update = () => setContainerW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = Math.max(0.2, Math.min(1, (containerW - 48) / 1080))

  const defaultTitle = `${profile?.name ? profile.name + ' ' : ''}${career ? '光影生涯' : year} ${topCategory} Top ${topN}`
  const defaultSubtitle = `PERSONAL TOP ${topN}`

  async function exportTop() {
    const node = document.getElementById('top-poster')
    if (!node) return
    try {
      setExporting(true)
      const pngUrl = await toPng(node, { pixelRatio: ratio, cacheBust: true })
      let dataUrl = pngUrl
      let name = `${defaultTitle}.png`
      if (format === 'jpg') {
        const img = new Image()
        img.src = pngUrl
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          dataUrl = canvas.toDataURL('image/jpeg', 0.92)
          name = `${defaultTitle}.jpg`
        }
      }
      const a = document.createElement('a')
      a.download = name
      a.href = dataUrl
      a.click()
      toast.success('榜单已导出')
    } catch (e) {
      console.error(e)
      toast.error('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 导出设置 */}
      <div className="space-y-3 rounded-md border bg-card p-4">
        <div>
          <h3 className="font-bold">生成 Top 榜</h3>
          <p className="text-sm text-muted-foreground">
            {profile ? `${profile.name} · ` : ''}共 {topN} 个名次。请先在「评选」页完成 Top 榜的评选，再导出榜单图片。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-3">
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
            {(['png', 'jpg'] as const).map((f) => (
              <button
                key={f}
                title={f === 'png' ? 'PNG：无损，文件较大' : 'JPG：文件小，适合社交平台分享'}
                className={`rounded px-2.5 py-1 uppercase transition ${format === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setFormat(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={showOscar}
              onCheckedChange={(on) => {
                setShowOscar(on)
                localStorage.setItem('poster-show-oscar', on ? '1' : '0')
              }}
            />
            报头显示小金人
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={showAvatar}
              onCheckedChange={(on) => {
                setShowAvatar(on)
                localStorage.setItem('poster-show-avatar', on ? '1' : '0')
              }}
            />
            报头显示豆瓣头像
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={medal}
              onCheckedChange={(on) => {
                setMedal(on)
                localStorage.setItem('top-show-medal', on ? '1' : '0')
              }}
            />
            前三名金银铜色调
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-bold">导出清晰度</span>
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
            {([1, 2, 3] as const).map((r) => (
              <button
                key={r}
                title={`榜单宽约 ${1080 * r} px（高度随名次数量变化）`}
                className={`rounded px-2.5 py-1 transition ${ratio === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setRatio(r)}
              >
                {r}x
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">榜单宽度 {1080 * ratio} px（高度随名次数量变化）</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="w-16 shrink-0 text-sm font-bold">榜单标题</span>
          <Input
            className="max-w-md"
            placeholder={defaultTitle}
            value={customTitle}
            onChange={(e) => {
              setCustomTitle(e.target.value)
              localStorage.setItem('top-custom-title', e.target.value)
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomTitle('')
              localStorage.removeItem('top-custom-title')
            }}
          >
            恢复默认标题
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="w-16 shrink-0 text-sm font-bold">榜单副标题</span>
          <Input
            className="max-w-md"
            placeholder={defaultSubtitle}
            value={customSubtitle}
            onChange={(e) => {
              setCustomSubtitle(e.target.value)
              localStorage.setItem('top-custom-subtitle', e.target.value)
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomSubtitle('')
              localStorage.removeItem('top-custom-subtitle')
            }}
          >
            恢复默认标题
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button onClick={exportTop} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            导出榜单
          </Button>
        </div>
      </div>

      {/* 预览：自适应缩放展示 1080 宽的榜单 */}
      <div ref={previewRef} className="space-y-8 overflow-x-auto rounded-md border bg-[#e5e5dd] p-6">
        <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
          <TopPoster showAvatar={showAvatar} showOscar={showOscar} medal={medal} customTitle={customTitle} customSubtitle={customSubtitle} />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">预览按 {Math.round(scale * 100)}% 自适应缩放显示。当前导出 {ratio}x 清晰度：榜单宽约 {1080 * ratio} px，高度随名次数量变化。</p>
    </div>
  )
}
