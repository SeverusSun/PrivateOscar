import { Button } from '@/components/ui/button'

export interface PosterTextStyle {
  /** 自定义文字颜色；空字符串表示使用海报默认配色 */
  color: string
  /** 文字整体缩放倍率 */
  scale: number
}

const SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.3] as const

/** 从 localStorage 读取文字样式（keyPrefix 如 'poster-grand-text'） */
export function loadTextStyle(keyPrefix: string): PosterTextStyle {
  const scale = Number(localStorage.getItem(`${keyPrefix}-scale`))
  return {
    color: localStorage.getItem(`${keyPrefix}-color`) ?? '',
    scale: (SCALES as readonly number[]).includes(scale) ? scale : 1,
  }
}

/** 将文字样式写入 localStorage */
export function saveTextStyle(keyPrefix: string, v: PosterTextStyle) {
  localStorage.setItem(`${keyPrefix}-scale`, String(v.scale))
  if (v.color) localStorage.setItem(`${keyPrefix}-color`, v.color)
  else localStorage.removeItem(`${keyPrefix}-color`)
}

/** 海报文字样式控制（文字大小 + 文字颜色），放在导出清晰度按钮下方 */
export default function TextStyleControls({ value, onChange }: { value: PosterTextStyle; onChange: (v: PosterTextStyle) => void }) {
  const customized = value.color !== '' || value.scale !== 1
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold">文字样式</span>
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
