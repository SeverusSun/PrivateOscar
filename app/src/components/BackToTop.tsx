import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

const BTN = 44
const MARGIN = 24

/** 右下角圆形回顶按钮：可拖动换位，点击平滑滚动到页面顶部 */
export default function BackToTop() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [visible, setVisible] = useState(false)
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null)

  useEffect(() => {
    const place = () =>
      setPos((p) => p ?? { x: window.innerWidth - BTN - MARGIN, y: window.innerHeight - BTN - MARGIN })
    const onScroll = () => setVisible(window.scrollY > 200)
    place()
    onScroll()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const cur = pos ?? { x: window.innerWidth - BTN - MARGIN, y: window.innerHeight - BTN - MARGIN }
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: cur.x, baseY: cur.y, moved: false }
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true
    if (d.moved) {
      setPos({
        x: Math.min(Math.max(8, d.baseX + dx), window.innerWidth - BTN - 8),
        y: Math.min(Math.max(8, d.baseY + dy), window.innerHeight - BTN - 8),
      })
    }
  }

  function onPointerUp() {
    const d = drag.current
    drag.current = null
    // 位移极小视为点击：返回页面顶部
    if (d && !d.moved) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!pos) return null
  return (
    <button
      title="回到顶部（可拖动调整位置）"
      className={`fixed z-50 flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-full bg-[#007722] text-white shadow-lg transition-all hover:bg-[#00661e] active:cursor-grabbing ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
