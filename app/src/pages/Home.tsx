import { useState } from 'react'
import { Clapperboard, Library, Vote, Trophy, ListOrdered, BookOpen } from 'lucide-react'
import SyncSection from '@/sections/SyncSection'
import LibrarySection from '@/sections/LibrarySection'
import AwardsSection from '@/sections/AwardsSection'
import PosterSection from '@/sections/PosterSection'
import TopSection from '@/sections/TopSection'
import AboutSection from '@/sections/AboutSection'
import BackToTop from '@/components/BackToTop'

const TABS: { id: string; label: string; icon: typeof Clapperboard }[] = [
  { id: 'sync', label: '同步', icon: Clapperboard },
  { id: 'library', label: '影库', icon: Library },
  { id: 'awards', label: '评选', icon: Vote },
  { id: 'poster', label: '奥斯卡', icon: Trophy },
  { id: 'top', label: 'Top榜', icon: ListOrdered },
  { id: 'about', label: '关于', icon: BookOpen },
]

type TabId = string

export default function Home() {
  const [tab, setTab] = useState<TabId>('sync')

  return (
    <div className="min-h-screen">
      {/* 仿豆瓣顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-[#0d5c1e] bg-[#007722] text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 text-lg font-bold tracking-wide">
            <Clapperboard className="h-5 w-5" />
            私人奥斯卡
          </div>
          <nav className="flex h-full">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 px-4 text-sm transition hover:bg-[#00661e] ${
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
        {tab === 'about' && <AboutSection />}
      </main>

      {/* 影库 / 评选 / 奥斯卡 / Top榜页显示可拖动回顶按钮 */}
      {tab !== 'sync' && <BackToTop />}

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        数据来源于豆瓣公开接口，仅保存在浏览器本地 · 私人奥斯卡
      </footer>
    </div>
  )
}
