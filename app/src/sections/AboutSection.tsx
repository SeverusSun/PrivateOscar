import { useState } from 'react'
import { BookOpen, Clapperboard, Library, Vote, Trophy, ListOrdered, ShieldCheck, Wrench, Heart, UserRound, UsersRound, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SupportAuthorDialog from '@/components/SupportAuthorDialog'

function CollapsibleCard({
  id,
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  id: string
  icon: React.ReactNode
  title: string
  open: boolean
  onToggle: (id: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center">
        <button
          className="mt-4 text-muted-foreground transition hover:text-primary"
          title={open ? '折叠' : '展开'}
          onClick={() => onToggle(id)}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex-1">
        <Card>
          <CardHeader className={open ? 'pb-3' : 'pb-1'}>
            <CardTitle className="flex items-center gap-2 text-primary">
              {icon} {title}
            </CardTitle>
          </CardHeader>
          {open && <CardContent className="space-y-3 text-sm leading-relaxed">{children}</CardContent>}
        </Card>
      </div>
    </div>
  )
}

export default function AboutSection() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [supportOpen, setSupportOpen] = useState(false)
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const isOpen = (id: string) => openIds.has(id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CollapsibleCard
        id="about"
        icon={<BookOpen className="h-5 w-5" />}
        title="关于本站"
        open={isOpen('about')}
        onToggle={toggle}
      >
        <p>
          Private_Oscar（私人奥斯卡）—— 基于你的豆瓣书影音档案，举办一场完全属于你自己的电影奥斯卡，并生成可以分享的专属海报。
        </p>
        <p>
          GitHub Repo：
          <a className="text-primary underline hover:text-primary/80" href="https://github.com/SeverusSun/PrivateOscar.git" target="_blank" rel="noreferrer">
            https://github.com/SeverusSun/PrivateOscar.git
          </a>
        </p>
      </CollapsibleCard>

      <CollapsibleCard
        id="author"
        icon={<UserRound className="h-5 w-5" />}
        title="关于作者"
        open={isOpen('author')}
        onToggle={toggle}
      >
        <p>本站作者：秋菊十二</p>
        <p>
          豆瓣ID：232857659 · GitHub 主页：
          <a className="text-primary underline hover:text-primary/80" href="https://github.com/SeverusSun" target="_blank" rel="noreferrer">
            https://github.com/SeverusSun
          </a>
        </p>
        <p>看的电影还不算多，但是真的很喜欢电影呀，欢迎大家交流！</p>
        <div className="flex justify-center">
          <Button variant="outline" className="min-h-11" onClick={() => setSupportOpen(true)}>
            <Heart className="mr-2 h-4 w-4" />
            支持作者
          </Button>
        </div>
        <SupportAuthorDialog open={supportOpen} onOpenChange={setSupportOpen} />
      </CollapsibleCard>

      <CollapsibleCard
        id="features"
        icon={<Clapperboard className="h-5 w-5" />}
        title="功能一览"
        open={isOpen('features')}
        onToggle={toggle}
      >
        <div className="flex gap-3">
          <Clapperboard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <b>同步</b>：输入豆瓣用户 ID 或主页链接，抓取「想看 / 在看 / 看过」的全部电影词条（海报、评分、短评、影评等）。
          </div>
        </div>
        <div className="flex gap-3">
          <Library className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <b>影库</b>：卡片 / 列表两种模式浏览词条，支持状态、年份、豆瓣评分、个人评分多重筛选。
          </div>
        </div>
        <div className="flex gap-3">
          <Vote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <b>评选</b>：两种评选模式——「奥斯卡」17 个传统奖项 + 20 个可选奖项 + 自定义奖项，逐一提名、颁奖、写颁奖词；「Top 榜」按名次排出你的 Top N 片单。
          </div>
        </div>
        <div className="flex gap-3">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <b>奥斯卡</b>：导出主海报（烫金获奖 + 海报墙）与完整名单（获奖烫金、提名墨绿、附颁奖词）。
          </div>
        </div>
        <div className="flex gap-3">
          <ListOrdered className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <b>Top榜</b>：导出「Top N」榜单图片，前三名金银铜色调，导演类别自动匹配导演照片。
          </div>
        </div>
        <div className="flex gap-3">
          <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <b>人人奥斯卡</b>：主动上传海报、筛选与点赞，查看每个奥斯卡奖项及每个 Top 类别的评选前十名。
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="privacy"
        icon={<ShieldCheck className="h-5 w-5" />}
        title="数据与隐私"
        open={isOpen('privacy')}
        onToggle={toggle}
      >
        <p>· 本站默认本地优先：影库、评选进度和海报设置仅保存在浏览器 localStorage，不会自动上传。</p>
        <p>· 只有在导出后主动点击「将海报上传网站」并确认，用户名、海报、评选结果及颁奖词才会公开到「人人奥斯卡」；豆瓣 UID 不公开展示。</p>
        <p>· 上传、覆盖、点赞和删除需要网站账号。可在「人人奥斯卡 → 海报展示 → 我的」中删除自己的公开评选。</p>
        <p>· 同步数据来自豆瓣公开接口，仅包含你账户公开的书影音档案信息。</p>
        <p>· 清除浏览器缓存或点击「同步」页的「清空同步数据」将删除本地数据，但不会删除已主动上传的数据。</p>
      </CollapsibleCard>

      <CollapsibleCard
        id="tech"
        icon={<Wrench className="h-5 w-5" />}
        title="技术说明"
        open={isOpen('tech')}
        onToggle={toggle}
      >
        <p>· 海报导出基于 html-to-image，在浏览器端完成图片渲染，无需后端。</p>
        <p>· 人物照片来自豆瓣演职员公开数据。</p>
      </CollapsibleCard>

      <CollapsibleCard
        id="disclaimer"
        icon={<Heart className="h-5 w-5" />}
        title="免责声明"
        open={isOpen('disclaimer')}
        onToggle={toggle}
      >
        <p className="text-muted-foreground">
          本站为非商业个人项目；电影海报、评分等内容的版权归原作者所有。生成的海报仅供个人纪念与分享，请勿用于商业用途。
        </p>
      </CollapsibleCard>
    </div>
  )
}
