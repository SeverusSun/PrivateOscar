import { useEffect, useState } from 'react'
import { Clapperboard, Library, Vote, Trophy, ListOrdered, BookOpen, UsersRound } from 'lucide-react'
import SyncSection from '@/sections/SyncSection'
import LibrarySection from '@/sections/LibrarySection'
import AwardsSection from '@/sections/AwardsSection'
import PosterSection from '@/sections/PosterSection'
import TopSection from '@/sections/TopSection'
import CommunitySection from '@/sections/CommunitySection'
import AboutSection from '@/sections/AboutSection'
import BackToTop from '@/components/BackToTop'

const TABS: { id: string; label: string; icon: typeof Clapperboard }[] = [
  { id: 'sync', label: '同步', icon: Clapperboard },
  { id: 'library', label: '影库', icon: Library },
  { id: 'awards', label: '评选', icon: Vote },
  { id: 'poster', label: '奥斯卡', icon: Trophy },
  { id: 'top', label: 'Top榜', icon: ListOrdered },
  { id: 'community', label: '人人奥斯卡', icon: UsersRound },
  { id: 'about', label: '关于', icon: BookOpen },
]

type TabId = string

export default function Home() {
  const [tab, setTab] = useState<TabId>('sync')

  // 评选页「评选好啦」等界面通过自定义事件跳转导航（无需把 tab 状态提升进全局仓库）
  useEffect(() => {
    const onNavigate = (e: Event) => setTab((e as CustomEvent<TabId>).detail)
    window.addEventListener('po:navigate', onNavigate)
    return () => window.removeEventListener('po:navigate', onNavigate)
  }, [])

  return (
    <div className="min-h-screen">
      {/* 仿豆瓣顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-[#0d5c1e] bg-[#007722] text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-2 sm:gap-6 sm:px-4">
          <div className="hidden items-center gap-2 text-lg font-bold tracking-wide sm:flex">
            <Clapperboard className="h-5 w-5" />
            私人奥斯卡
          </div>
          <nav className="flex h-full min-w-0 flex-1 overflow-x-auto" aria-label="主导航">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm transition hover:bg-[#00661e] sm:px-4 ${
                  tab === t.id ? 'bg-[#00661e] font-bold' : 'text-white/85'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="py-8">
        {tab === 'sync' && <SyncSection />}
        {tab === 'library' && <LibrarySection />}
        {tab === 'awards' && <AwardsSection />}
        {tab === 'poster' && <PosterSection />}
        {tab === 'top' && <TopSection />}
        {tab === 'community' && <CommunitySection />}
        {tab === 'about' && <AboutSection />}
      </main>

      {/* 影库 / 评选 / 奥斯卡 / Top榜页显示可拖动回顶按钮 */}
      {tab !== 'sync' && <BackToTop />}

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        本地数据不会自动上传，主动上传的内容将公开展示 · 私人奥斯卡
      </footer>
    </div>
  )
}
