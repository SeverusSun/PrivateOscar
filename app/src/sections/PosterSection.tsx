import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Download, Loader2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store'
import { proxiedImage } from '@/lib/storage'
import { resolvePerson, useCreditsLoader } from '@/lib/persons'
import oscarUrl from '@/assets/oscar.png'
import oscarSilhouetteUrl from '@/assets/oscar-silhouette.png'
import { TBD_ID } from '@/types'
import type { AwardDef, MovieEntry } from '@/types'

const GOLD = '#c9a227'
const INK_GREEN = '#1b4332'
const RATING_ORANGE = '#e09015'
/** 海报标题：书法体；奖项名：中式优雅体 */
const TITLE_FONT = '"KaiTi", "STKaiti", "KaiTi SC", "楷体", "Noto Serif SC", serif'
const AWARD_FONT = '"KaiTi", "STKaiti", "KaiTi SC", "楷体", "Noto Serif SC", serif'

function MoviePosterThumb({ movie, w = 96 }: { movie: MovieEntry; w?: number }) {
  const h = Math.round((w * 3) / 2)
  return (
    <div style={{ width: w, height: h }} className="overflow-hidden rounded-sm bg-[#e8e8e0] shadow-sm">
      {movie.poster ? (
        <img
          src={proxiedImage(movie.poster)}
          alt={movie.title}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          style={{ width: w, height: h, objectFit: 'cover' }}
        />
      ) : null}
    </div>
  )
}

/** 海报内使用的星级显示（实心/描边 SVG 星星）；emptyOutline 时未评分显示五颗描边星 */
function StarRow({ value, size = 14, emptyOutline = false }: { value: number | null; size?: number; emptyOutline?: boolean }) {
  if (value == null && !emptyOutline) return <span style={{ color: '#9ca3af', fontSize: size }}>未评</span>
  const filled = value == null ? 0 : Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < filled ? '#e09015' : 'none'} stroke="#e09015" strokeWidth="1.5">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
      ))}
    </span>
  )
}

/** 名单行：👑/空 独立成列，片名 / 导演 / 豆瓣评分 / 用户星级 */
function ListLine({ movie, person, color, winner }: { movie: MovieEntry; person?: string; color: string; winner?: boolean }) {
  return (
    <div className="flex items-baseline text-[14px]" style={{ color }}>
      <span className="mr-1.5 inline-block w-4 shrink-0 text-center">{winner ? '👑' : ''}</span>
      <span className="min-w-0 truncate">
        <span className={winner ? 'font-bold' : ''}>
          {person ? `${person} ` : ''}
          {movie.title}
        </span>
        {movie.directors.length ? `　${movie.directors.map((d) => d.name).join(' / ')}` : ''}　豆瓣 {movie.doubanRating?.toFixed(1) ?? '—'}　
        <StarRow value={movie.userRating ?? null} size={13} emptyOutline />
      </span>
    </div>
  )
}

/** 海报一：私人奥斯卡海报（奖项名在上、图片居中、片名/导演/评分在下；支持 2 / 4 / 6 列切换） */
function GrandPoster({ awards, cols, showAvatar, showOscar, customTitle, customSubtitle }: { awards: AwardDef[]; cols: 2 | 4 | 6; showAvatar: boolean; showOscar: boolean; customTitle?: string; customSubtitle?: string }) {
  const { profile, movieById, year, career, getResult } = useStore()
  // 单元格宽度不变：2 列 470、4/6 列 235；6 列时整幅宽度约为 4 列的 1.5 倍
  const imgW = cols === 2 ? 470 : 235
  const posterW = cols === 6 ? 1620 : 1080
  // 6 列时同步放大报头元素，保持整幅比例协调
  const head = cols === 6 ? { oscar: 150, title: 52, avatar: 112, eng: 18 } : { oscar: 130, title: 46, avatar: 104, eng: 16 }
  const heading =
    customTitle?.trim() ||
    (career ? `${profile?.name ? profile.name + ' ' : ''}光影生涯奥斯卡` : `${profile?.name ? profile.name + ' ' : ''}${year} 私人奥斯卡`)
  const subtitle = customSubtitle?.trim() || 'PERSONAL ACADEMY AWARDS'
  return (
    <div
      id="grand-poster"
      className="bg-[#f6f6f0] px-10 py-8"
      style={{ width: posterW, fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
    >
      {/* 报头：小金人（可关） + 标题 + 可选豆瓣头像；关闭时用等宽占位保持标题居中 */}
      <div className="flex items-center justify-between">
        {showOscar ? (
          <img src={oscarUrl} alt="奥斯卡小金人" crossOrigin="anonymous" style={{ height: head.oscar }} />
        ) : (
          <div style={{ width: head.oscar * 0.6 }} />
        )}
        <div className="text-center">
          <div className="tracking-[0.5em] text-[#6b7280]" style={{ fontSize: head.eng }}>{subtitle}</div>
          <div className="mt-2 font-bold tracking-wider text-[#0f3d21]" style={{ fontSize: head.title, fontFamily: TITLE_FONT }}>
            {heading}
          </div>
        </div>
        {showAvatar && profile?.avatar ? (
          <img
            src={proxiedImage(profile.avatar)}
            alt={profile.name}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{ width: head.avatar, height: head.avatar, borderRadius: '50%', border: '3px solid #c9a227', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: head.avatar }} />
        )}
      </div>
      <div className="mx-auto mt-3 h-px w-4/5 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent" />

      <div
        className={`mt-6 grid ${
          cols === 2 ? 'grid-cols-2 gap-x-6 gap-y-5' : cols === 6 ? 'grid-cols-6 gap-x-4 gap-y-4' : 'grid-cols-4 gap-x-4 gap-y-4'
        }`}
      >
        {awards.map((a) => {
          const r = getResult(a.id)
          const big = cols === 2
          // 未定：获奖位显示未定（奖项名正常展示）
          const pending =
            r.winnerTbd || r.winner?.movieId === TBD_ID || (!r.winner && r.nominations.some((n) => n.movieId === TBD_ID))
          if (pending) {
            return (
              <div key={a.id} className="flex flex-col items-center rounded-md border border-dashed border-[#c9a227] bg-white/70 p-3 text-center">
                <div className={`${big ? 'text-[22px]' : 'text-[16px]'} font-bold tracking-widest`} style={{ color: GOLD, fontFamily: AWARD_FONT }}>
                  {a.name}
                </div>
                <div
                  className={`${big ? 'my-3' : 'my-2'} flex items-center justify-center rounded-sm border border-dashed border-[#d8d8cc] bg-[#f1f1e8]`}
                  style={{ width: imgW, height: Math.round((imgW * 3) / 2) }}
                >
                  <img src={oscarSilhouetteUrl} alt="未定奖杯剪影" crossOrigin="anonymous" style={{ height: big ? '86%' : '80%', opacity: 0.75 }} />
                </div>
                <div className={`w-full truncate ${big ? 'text-[28px]' : 'text-[20px]'} font-bold text-[#9ca3af]`} style={{ fontFamily: TITLE_FONT }}>
                  未定
                </div>
                <div className={`mt-0.5 ${big ? 'text-[18px]' : 'text-[14px]'} text-[#9ca3af]`}>感觉选不出合适的呢</div>
              </div>
            )
          }
          // 统一解析获奖位展示：手动上传的照片最优先，人物奖项自动匹配豆瓣演职员照片，兜底电影海报
          const winNom = r.winner ? r.nominations.find((n) => n.movieId === r.winner!.movieId) : null
          const movie = winNom ? movieById(winNom.movieId) : undefined
          const person = winNom ? resolvePerson(a, winNom, movie) : { name: '', image: '', manual: false }
          return (
            <div key={a.id} className="flex flex-col items-center rounded-md border border-[#d8d8cc] bg-white/70 p-3 text-center">
              <div className={`${big ? 'text-[22px]' : 'text-[16px]'} font-bold tracking-widest`} style={{ color: GOLD, fontFamily: AWARD_FONT }}>
                {a.name}
              </div>
              <div className={`${big ? 'my-3' : 'my-2'} flex items-center justify-center overflow-hidden rounded-sm bg-[#ecece2] shadow-sm`} style={{ width: imgW, height: Math.round((imgW * 3) / 2) }}>
                {person.image ? (
                  <img
                    src={person.manual ? person.image : proxiedImage(person.image)}
                    alt={person.name || movie?.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    style={{ width: imgW, height: Math.round((imgW * 3) / 2), objectFit: 'cover' }}
                  />
                ) : movie ? (
                  <MoviePosterThumb movie={movie} w={imgW} />
                ) : (
                  <span className="text-[11px] text-[#9ca3af]">未评出</span>
                )}
              </div>
              <div className={`w-full truncate ${big ? 'text-[28px]' : 'text-[20px]'} font-bold text-[#111827]`}>{person.name || movie?.title || '—'}</div>
              {person.name && movie ? (
                <div className={`mt-0.5 w-full truncate ${big ? 'text-[18px]' : 'text-[14px]'} text-[#4b5563]`}>《{movie.title}》</div>
              ) : movie && (movie.directors.length > 0 || movie.year) ? (
                <div className={`mt-0.5 w-full truncate ${big ? 'text-[18px]' : 'text-[14px]'} text-[#4b5563]`}>
                  {movie.directors.length > 0 ? movie.directors.map((d) => d.name).join(' / ') : movie.year}
                </div>
              ) : null}
              {movie && (
                <div className={`mt-auto flex w-full items-center justify-center gap-2 pt-2 ${big ? 'text-[19px]' : 'text-[15px]'} text-[#4b5563]`}>
                  豆瓣 <b style={{ color: RATING_ORANGE }}>{movie.doubanRating?.toFixed(1) ?? '—'}</b>
                  <StarRow value={movie.userRating} size={big ? 20 : 16} emptyOutline />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-center text-[12px] tracking-widest text-[#9ca3af]">
        — {new Date().toISOString().slice(0, 10)} · 由「私人奥斯卡」生成 —
      </div>
    </div>
  )
}

/** 海报二：详细提名列表海报（仅文字；获奖烫金，提名墨绿） */
function ListPoster({ awards, showAvatar, showOscar, customTitle, customSubtitle }: { awards: AwardDef[]; showAvatar: boolean; showOscar: boolean; customTitle?: string; customSubtitle?: string }) {
  const { profile, movieById, year, career, getResult } = useStore()
  const heading =
    customTitle?.trim() ||
    `${career ? `${profile?.name ? profile.name + ' ' : ''}光影生涯奥斯卡` : `${profile?.name ? profile.name + ' ' : ''}${year} 私人奥斯卡`}完整名单`
  const subtitle = customSubtitle?.trim() || (career ? 'NOMINATIONS · CAREER' : `NOMINATIONS · ${year}`)
  return (
    <div
      id="list-poster"
      className="bg-[#f6f6f0] px-12 py-8"
      style={{ width: 1000, fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
    >
      <div className="flex items-center justify-between">
        {showOscar ? (
          <img src={oscarUrl} alt="奥斯卡小金人" crossOrigin="anonymous" style={{ height: 92 }} />
        ) : (
          <div style={{ width: 55 }} />
        )}
        <div className="text-center">
          <div className="tracking-[0.5em] text-[#6b7280]" style={{ fontSize: 14 }}>{subtitle}</div>
          <div className="mt-2 font-bold tracking-wider text-[#0f3d21]" style={{ fontSize: 38, fontFamily: TITLE_FONT }}>
            {heading}
          </div>
        </div>
        {showAvatar && profile?.avatar ? (
          <img
            src={proxiedImage(profile.avatar)}
            alt={profile.name}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{ width: 78, height: 78, borderRadius: '50%', border: '3px solid #c9a227', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: 78 }} />
        )}
      </div>
      <div className="mx-auto mt-3 h-px w-4/5 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent" />

      <div className="mt-8 space-y-5">
        {awards.map((a) => {
          const r = getResult(a.id)
          const winner = r.winner ? movieById(r.winner.movieId) : undefined
          const winNom = r.winner ? r.nominations.find((n) => n.movieId === r.winner!.movieId) : null
          const noms = r.nominations.filter((n) => n.movieId !== r.winner?.movieId && n.movieId !== TBD_ID)
          // 获奖位未定：名单显示提名，获奖行显示未定
          const pendingWinner = r.winnerTbd || r.winner?.movieId === TBD_ID
          // 颁奖词：文本输入 > 电影短评 > 奖项说明；都没有则不显示
          const citation = !pendingWinner && winner ? (r.citation?.trim() || winner.shortComment.trim() || a.description.trim()) : ''
          return (
            <div key={a.id} className="flex items-start gap-4 border-b border-dashed border-[#d8d8cc] pb-3">
              <div className="w-40 shrink-0 pt-0.5 text-right text-[15px] font-bold" style={{ color: GOLD, fontFamily: AWARD_FONT }}>
                {a.name}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {pendingWinner ? (
                  <div className="flex items-baseline">
                    <span className="mr-1.5 inline-block w-4 shrink-0 text-center">👑</span>
                    <span className="font-bold text-[14px]" style={{ color: GOLD }}>
                      未定
                    </span>
                  </div>
                ) : winNom && winner ? (
                  <ListLine movie={winner} person={resolvePerson(a, winNom, winner).name || undefined} color={GOLD} winner />
                ) : (
                  <div className="flex items-baseline">
                    <span className="mr-1.5 inline-block w-4 shrink-0 text-center">👑</span>
                    <span className="font-bold text-[14px]" style={{ color: GOLD }}>
                      —
                    </span>
                  </div>
                )}
                {noms.map((n) => {
                  const m = movieById(n.movieId)
                  if (!m) return null
                  const name = n.person?.name || resolvePerson(a, n, m).name || undefined
                  return <ListLine key={n.movieId} movie={m} person={name} color={INK_GREEN} />
                })}
              </div>
              {/* 右侧空白：颁奖词（右缘大致对齐报头用户头像的中线） */}
              <div className="mr-10 w-72 shrink-0 pt-0.5 text-right text-[12px] italic leading-relaxed text-[#6b7280]">
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

export default function PosterSection() {
  const { activeAwards, year, career, profile, getResult } = useStore()
  const [exporting, setExporting] = useState<string | null>(null)
  const [cols, setCols] = useState<2 | 4 | 6>(4)
  const [ratio, setRatio] = useState<1 | 2 | 3>(2)
  const [preview, setPreview] = useState<'grand' | 'list'>('grand')
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [customTitle, setCustomTitle] = useState(() => localStorage.getItem('poster-custom-title') ?? '')
  const [customListTitle, setCustomListTitle] = useState(() => localStorage.getItem('poster-custom-list-title') ?? '')
  const [customSubtitle, setCustomSubtitle] = useState(() => localStorage.getItem('poster-custom-subtitle') ?? '')
  const [customListSubtitle, setCustomListSubtitle] = useState(() => localStorage.getItem('poster-custom-list-subtitle') ?? '')

  // 懒加载全部提名影片的演职员数据，供人物照片自动匹配
  const nominatedIds = activeAwards.flatMap((a) => getResult(a.id).nominations.map((n) => n.movieId).filter((id) => id !== TBD_ID))
  useCreditsLoader(nominatedIds)
  const [showAvatar, setShowAvatar] = useState(() => localStorage.getItem('poster-show-avatar') === '1')
  const [showOscar, setShowOscar] = useState(() => localStorage.getItem('poster-show-oscar') !== '0')
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

  // 自适应预览缩放：让海报尽量占满预览区宽度
  const grandW = cols === 6 ? 1620 : 1080
  const posterW = preview === 'grand' ? grandW : 1000
  const scale = Math.max(0.2, Math.min(1, (containerW - 48) / posterW))

  async function exportPoster(nodeId: string, filename: string) {
    const node = document.getElementById(nodeId)
    if (!node) return
    try {
      setExporting(nodeId)
      const pngUrl = await toPng(node, { pixelRatio: ratio, cacheBust: true })
      let dataUrl = pngUrl
      let name = filename
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
          name = filename.replace(/\.png$/, '.jpg')
        }
      }
      const a = document.createElement('a')
      a.download = name
      a.href = dataUrl
      a.click()
      toast.success('海报已导出')
    } catch (e) {
      console.error(e)
      toast.error('导出失败，请重试')
    } finally {
      setExporting(null)
    }
  }

  const awardedCount = activeAwards.length
  const defaultGrandTitle = career
    ? `${profile?.name ? profile.name + ' ' : ''}光影生涯奥斯卡`
    : `${profile?.name ? profile.name + ' ' : ''}${year} 私人奥斯卡`
  const defaultListTitle = `${defaultGrandTitle}完整名单`
  const defaultGrandSubtitle = 'PERSONAL ACADEMY AWARDS'
  const defaultListSubtitle = career ? 'NOMINATIONS · CAREER' : `NOMINATIONS · ${year}`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 导出设置：合并为一个卡片 */}
      <div className="space-y-3 rounded-md border bg-card p-4">
        <div>
          <h3 className="font-bold">生成 {career ? '光影生涯' : `${year} 年度`}海报</h3>
          <p className="text-sm text-muted-foreground">
            {profile ? `${profile.name} · ` : ''}共 {awardedCount} 个奖项。请先完成「评选」页的奖项设置，再导出海报。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-bold">预览内容</span>
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
            <button
              className={`rounded px-2.5 py-1 transition ${preview === 'grand' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setPreview('grand')}
            >
              预览海报
            </button>
            <button
              className={`rounded px-2.5 py-1 transition ${preview === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setPreview('list')}
            >
              预览完整名单
            </button>
          </div>
          {preview === 'grand' && (
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
            <button
              className={`rounded px-2.5 py-1 transition ${cols === 2 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setCols(2)}
            >
              一行两个
            </button>
            <button
              className={`rounded px-2.5 py-1 transition ${cols === 4 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setCols(4)}
            >
              一行四个
            </button>
            <button
              title="单元格大小与一行四个相同，每行多排 2 列，整幅宽度约为其 1.5 倍"
              className={`rounded px-2.5 py-1 transition ${cols === 6 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setCols(6)}
            >
              一行六个
            </button>
          </div>
          )}
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
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-bold">导出清晰度</span>
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
            {([1, 2, 3] as const).map((r) => (
              <button
                key={r}
                title={preview === 'grand' ? `海报宽约 ${grandW * r} px（高度随奖项数量变化）` : `名单宽约 ${1000 * r} px（高度随奖项数量变化）`}
                className={`rounded px-2.5 py-1 transition ${ratio === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setRatio(r)}
              >
                {r}x
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {preview === 'grand' ? `海报宽度 ${grandW * ratio} px` : `名单宽度 ${1000 * ratio} px`}（高度随奖项数量变化）
          </span>
        </div>
        {/* 预览海报时：只显示海报的标题/副标题输入 */}
        {preview === 'grand' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="w-16 shrink-0 text-sm font-bold">海报标题</span>
          <Input
            className="max-w-md"
            placeholder={defaultGrandTitle}
            value={customTitle}
            onChange={(e) => {
              setCustomTitle(e.target.value)
              localStorage.setItem('poster-custom-title', e.target.value)
            }}
          />
          <Button variant="outline" size="sm" onClick={() => {
            setCustomTitle('')
            localStorage.removeItem('poster-custom-title')
          }}>
            恢复默认标题
          </Button>
        </div>
        )}
        {/* 预览完整名单时：只显示名单的标题/副标题输入 */}
        {preview === 'list' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="w-16 shrink-0 text-sm font-bold">名单标题</span>
          <Input
            className="max-w-md"
            placeholder={defaultListTitle}
            value={customListTitle}
            onChange={(e) => {
              setCustomListTitle(e.target.value)
              localStorage.setItem('poster-custom-list-title', e.target.value)
            }}
          />
          <Button variant="outline" size="sm" onClick={() => {
            setCustomListTitle('')
            localStorage.removeItem('poster-custom-list-title')
          }}>
            恢复默认标题
          </Button>
        </div>
        )}
        {preview === 'grand' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="w-16 shrink-0 text-sm font-bold">海报副标题</span>
          <Input
            className="max-w-md"
            placeholder={defaultGrandSubtitle}
            value={customSubtitle}
            onChange={(e) => {
              setCustomSubtitle(e.target.value)
              localStorage.setItem('poster-custom-subtitle', e.target.value)
            }}
          />
          <Button variant="outline" size="sm" onClick={() => {
            setCustomSubtitle('')
            localStorage.removeItem('poster-custom-subtitle')
          }}>
            恢复默认标题
          </Button>
        </div>
        )}
        {preview === 'list' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="w-16 shrink-0 text-sm font-bold">名单副标题</span>
          <Input
            className="max-w-md"
            placeholder={defaultListSubtitle}
            value={customListSubtitle}
            onChange={(e) => {
              setCustomListSubtitle(e.target.value)
              localStorage.setItem('poster-custom-list-subtitle', e.target.value)
            }}
          />
          <Button variant="outline" size="sm" onClick={() => {
            setCustomListSubtitle('')
            localStorage.removeItem('poster-custom-list-subtitle')
          }}>
            恢复默认标题
          </Button>
        </div>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {preview === 'grand' ? (
            <Button onClick={() => exportPoster('grand-poster', career ? '光影生涯奥斯卡海报.png' : `${year}私人奥斯卡海报.png`)} disabled={!!exporting}>
              {exporting === 'grand-poster' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              导出海报
            </Button>
          ) : (
            <Button onClick={() => exportPoster('list-poster', career ? '光影生涯奥斯卡完整名单.png' : `${year}私人奥斯卡完整名单.png`)} disabled={!!exporting}>
              {exporting === 'list-poster' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              导出完整名单
            </Button>
          )}
        </div>
      </div>

      {/* 预览：缩放展示实际 1080/1000 宽的海报 */}
      <div ref={previewRef} className="space-y-8 overflow-x-auto rounded-md border bg-[#e5e5dd] p-6">
        {preview === 'grand' ? (
          <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
            <GrandPoster awards={activeAwards} cols={cols} showAvatar={showAvatar} showOscar={showOscar} customTitle={customTitle} customSubtitle={customSubtitle} />
          </div>
        ) : (
          <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
            <ListPoster awards={activeAwards} showAvatar={showAvatar} showOscar={showOscar} customTitle={customListTitle} customSubtitle={customListSubtitle} />
          </div>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-[#c9a227]" /> 预览按 {Math.round(scale * 100)}% 自适应缩放显示。当前导出 {ratio}x 清晰度：海报宽约 {grandW * ratio} px，名单海报宽约 {1000 * ratio} px，高度随奖项数量变化。
      </p>
    </div>
  )
}
