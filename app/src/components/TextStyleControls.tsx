import { Button } from '@/components/ui/button'

export interface PosterTextStyle {
  /** 自定义文字颜色；空字符串表示使用海报默认配色 */
  color: string
  /** 文字整体缩放倍率 */
  scale: number
}

/** 海报文字三组样式：标题/副标题、奖项名/电影信息、颁奖词 */
export interface PosterTextGroups {
  title: PosterTextStyle
  info: PosterTextStyle
  citation: PosterTextStyle
}

export const DEFAULT_TEXT_GROUPS: PosterTextGroups = {
  title: { color: '', scale: 1 },
  info: { color: '', scale: 1 },
  citation: { color: '', scale: 1 },
}

const SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.3] as const

function validScale(v: unknown): number {
  return (SCALES as readonly number[]).includes(Number(v)) ? Number(v) : 1
}

function validColor(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** 从 localStorage 读取三组文字样式（keyPrefix 如 'poster-grand-text'） */
export function loadTextGroups(keyPrefix: string): PosterTextGroups {
  try {
    const raw = localStorage.getItem(`${keyPrefix}-groups`)
    if (!raw) return DEFAULT_TEXT_GROUPS
    const p = JSON.parse(raw)
    return {
      title: { color: validColor(p?.title?.color), scale: validScale(p?.title?.scale) },
      info: { color: validColor(p?.info?.color), scale: validScale(p?.info?.scale) },
      citation: { color: validColor(p?.citation?.color), scale: validScale(p?.citation?.scale) },
    }
  } catch {
    return DEFAULT_TEXT_GROUPS
  }
}

/** 将三组文字样式写入 localStorage */
export function saveTextGroups(keyPrefix: string, g: PosterTextGroups) {
  localStorage.setItem(`${keyPrefix}-groups`, JSON.stringify(g))
}

/** 单组海报文字样式控制（文字大小 + 文字颜色）；三行分别控制标题/副标题、奖项名/电影信息、颁奖词 */
export default function TextStyleControls({ label, value, onChange }: { label: string; value: PosterTextStyle; onChange: (v: PosterTextStyle) => void }) {
  const customized = value.color !== '' || value.scale !== 1
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
      {customized && (
        <Button variant="outline" size="sm" onClick={() => onChange({ color: '', scale: 1 })}>
          恢复默认
        </Button>
      )}
    </div>
  )
}
