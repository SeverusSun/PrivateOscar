import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export interface PosterTextStyle {
  /** 自定义文字颜色；空字符串表示使用海报默认配色 */
  color: string
  /** 文字整体缩放倍率 */
  scale: number
  /** 自定义字体（font-family 值）；空字符串表示使用海报默认字体 */
  font: string
}

/** 常用字体列表（本机常见中文字体；导出海报由本机浏览器渲染，因此可直接使用） */
export const FONT_OPTIONS = [
  { key: '', label: '默认字体', family: '' },
  { key: 'kaiti', label: '楷体', family: '"KaiTi", "STKaiti", "KaiTi SC", "楷体", serif' },
  { key: 'simsun', label: '宋体', family: '"SimSun", "NSimSun", "宋体", serif' },
  { key: 'simhei', label: '黑体', family: '"SimHei", "黑体", sans-serif' },
  { key: 'yahei', label: '微软雅黑', family: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { key: 'fangsong', label: '仿宋', family: '"FangSong", "STFangsong", "仿宋", serif' },
  { key: 'lisu', label: '隶书', family: '"LiSu", "隶书", serif' },
  { key: 'youyuan', label: '幼圆', family: '"YouYuan", "幼圆", sans-serif' },
  { key: 'dengxian', label: '等线', family: '"DengXian", "等线", sans-serif' },
  { key: 'noto-serif', label: '思源宋体', family: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' },
  { key: 'noto-sans', label: '思源黑体', family: '"Noto Sans SC", "Source Han Sans SC", "思源黑体", sans-serif' },
] as const

/** 本机字体列表缓存（读取一次后存入 localStorage，无需重复授权） */
const LOCAL_FONTS_KEY = 'poster-local-font-list'

function readCachedLocalFonts(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_FONTS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** 通过浏览器 Local Font Access API 读取本机安装的全部字体（需用户点击授权） */
async function querySystemFonts(): Promise<string[]> {
  const w = window as unknown as { queryLocalFonts?: () => Promise<{ family: string }[]> }
  if (!w.queryLocalFonts) throw new Error('unsupported')
  const fonts = await w.queryLocalFonts()
  // 常用字体列表已覆盖的不再重复列出
  const skip = new Set(
    FONT_OPTIONS
      .map((f) => f.family.match(/"([^"]+)"/)?.[1])
      .filter((x): x is string => !!x)
  )
  const set = new Set<string>()
  for (const f of fonts) {
    if (f.family && !skip.has(f.family)) set.add(f.family)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

/** 海报文字三组样式：标题/副标题、奖项名/电影信息、颁奖词 */
export interface PosterTextGroups {
  title: PosterTextStyle
  info: PosterTextStyle
  citation: PosterTextStyle
}

export const DEFAULT_TEXT_GROUPS: PosterTextGroups = {
  title: { color: '', scale: 1, font: '' },
  info: { color: '', scale: 1, font: '' },
  citation: { color: '', scale: 1, font: '' },
}

const SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.3] as const

function validScale(v: unknown): number {
  return (SCALES as readonly number[]).includes(Number(v)) ? Number(v) : 1
}

function validColor(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function validFont(v: unknown): string {
  if (typeof v !== 'string' || !v) return ''
  if (FONT_OPTIONS.some((f) => f.family === v)) return v
  // 本机字体格式："FamilyName", serif / sans-serif
  return /^"[^"]{1,60}", (serif|sans-serif)$/.test(v) ? v : ''
}

/** 生成某一组文字的覆盖规则（颜色 + 字体），作用于海报内带对应标记类名的元素 */
export function groupStyleRules(scope: string, cls: string, s: PosterTextStyle): string {
  const rules: string[] = []
  if (s.color) rules.push(`${scope} .${cls}, ${scope} .${cls} * { color: ${s.color} !important; }`)
  if (s.font) rules.push(`${scope} .${cls}, ${scope} .${cls} * { font-family: ${s.font} !important; }`)
  return rules.join('\n')
}

/** 从 localStorage 读取三组文字样式（keyPrefix 如 'poster-grand-text'） */
export function loadTextGroups(keyPrefix: string): PosterTextGroups {
  try {
    const raw = localStorage.getItem(`${keyPrefix}-groups`)
    if (!raw) return DEFAULT_TEXT_GROUPS
    const p = JSON.parse(raw)
    return {
      title: { color: validColor(p?.title?.color), scale: validScale(p?.title?.scale), font: validFont(p?.title?.font) },
      info: { color: validColor(p?.info?.color), scale: validScale(p?.info?.scale), font: validFont(p?.info?.font) },
      citation: { color: validColor(p?.citation?.color), scale: validScale(p?.citation?.scale), font: validFont(p?.citation?.font) },
    }
  } catch {
    return DEFAULT_TEXT_GROUPS
  }
}

/** 将三组文字样式写入 localStorage */
export function saveTextGroups(keyPrefix: string, g: PosterTextGroups) {
  localStorage.setItem(`${keyPrefix}-groups`, JSON.stringify(g))
}

/** 单组海报文字样式控制（文字大小 + 文字颜色 + 字体）；三行分别控制标题/副标题、奖项名/电影信息、颁奖词 */
export default function TextStyleControls({ label, value, onChange }: { label: string; value: PosterTextStyle; onChange: (v: PosterTextStyle) => void }) {
  const customized = value.color !== '' || value.scale !== 1 || value.font !== ''
  const [localFonts, setLocalFonts] = useState<string[]>(readCachedLocalFonts)
  const [loadingFonts, setLoadingFonts] = useState(false)

  async function loadAllFonts() {
    setLoadingFonts(true)
    try {
      const families = await querySystemFonts()
      setLocalFonts(families)
      localStorage.setItem(LOCAL_FONTS_KEY, JSON.stringify(families))
      toast.success(`已读取 ${families.length} 个本机字体`)
    } catch {
      toast.error('无法读取本机字体：当前浏览器不支持或已取消授权')
    } finally {
      setLoadingFonts(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 shrink-0 text-sm font-bold">{label}</span>
      <div className="flex items-center gap-1 rounded-md border p-0.5 text-sm">
        {SCALES.map((s) => (
          <button
            key={s}
            className={`rounded px-2 py-1 transition ${value.scale === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => onChange({ ...value, scale: s })}
          >
            {Math.round(s * 100)}%
          </button>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 text-sm">
        文字颜色
        <input
          type="color"
          value={value.color || '#1f2937'}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5"
          title="选择海报文字颜色"
        />
      </label>
      <select
        value={value.font}
        onChange={(e) => onChange({ ...value, font: e.target.value })}
        className="h-8 max-w-44 rounded-md border bg-background px-2 text-sm"
        title="选择海报文字字体"
      >
        <optgroup label="常用字体">
          {FONT_OPTIONS.map((f) => (
            <option key={f.key} value={f.family} style={f.family ? { fontFamily: f.family } : undefined}>
              {f.label}
            </option>
          ))}
        </optgroup>
        {localFonts.length > 0 && (
          <optgroup label="本机全部字体">
            {localFonts.map((fam) => (
              <option key={fam} value={`"${fam}", serif`} style={{ fontFamily: `"${fam}", serif` }}>
                {fam}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={loadAllFonts}
        disabled={loadingFonts}
        title="通过浏览器读取 Windows 本机安装的全部字体（首次需授权），读取结果会缓存"
      >
        {loadingFonts ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
        {localFonts.length > 0 ? '重新读取本机字体' : '加载全部本机字体'}
      </Button>
      {customized && (
        <Button variant="outline" size="sm" onClick={() => onChange({ color: '', scale: 1, font: '' })}>
          恢复默认
        </Button>
      )}
    </div>
  )
}
