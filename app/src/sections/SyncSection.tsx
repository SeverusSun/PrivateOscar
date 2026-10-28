import { useState } from 'react'
import { RefreshCw, Clapperboard, Link2, UserRound, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useStore } from '@/store'
import { proxiedImage } from '@/lib/storage'
import { fetchUser, parseUid, syncMovies, type SyncProgress } from '@/lib/douban'

export default function SyncSection() {
  const { profile, movies, setProfile, setMovies, resetAll } = useStore()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [includeTv, setIncludeTv] = useState(() => localStorage.getItem('sync-include-tv') === '1')

  async function handleSync() {
    try {
      setBusy(true)
      setProgress({ phase: '正在解析账号…', done: 0, total: 0 })
      const uid = parseUid(input || profile?.uid || '')
      const p = await fetchUser(uid)
      setProfile(p)
      setProgress({ phase: '账号验证成功', done: 0, total: 0 })
      const list = await syncMovies(uid, setProgress, { includeTv })
      setMovies(list)
      toast.success(`同步完成，共 ${list.length} 条词条`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '同步失败，请稍后重试')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const doneCount = movies.filter((m) => m.status === 'done').length
  const doingCount = movies.filter((m) => m.status === 'doing').length
  const wishCount = movies.filter((m) => m.status === 'wish').length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clapperboard className="h-5 w-5" /> 同步豆瓣账户
          </CardTitle>
          <CardDescription>
            输入你的豆瓣用户 ID 或主页链接（如 https://www.douban.com/people/abc/），自动抓取「想看 / 在看 /
            看过」的全部电影词条。所有数据仅保存在你自己的浏览器本地。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="douban-input">豆瓣账号</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="douban-input"
                  className="pl-9"
                  placeholder={profile ? `${profile.name}（${profile.uid}）` : '用户 ID 或主页链接'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <Button onClick={handleSync} disabled={busy}>
                {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                {busy ? '同步中…' : profile ? '重新同步' : '开始同步'}
              </Button>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                <Checkbox
                  checked={includeTv}
                  onCheckedChange={(v) => {
                    setIncludeTv(!!v)
                    localStorage.setItem('sync-include-tv', v ? '1' : '0')
                  }}
                />
                包含动画/剧集
              </label>
            </div>
          </div>

          {progress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progress.phase}</span>
                {progress.total > 0 && (
                  <span>
                    {progress.done} / {progress.total}
                  </span>
                )}
              </div>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 30} />
            </div>
          )}
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Avatar className="h-14 w-14">
              <AvatarImage src={proxiedImage(profile.avatar)} referrerPolicy="no-referrer" />
              <AvatarFallback>
                <UserRound className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="text-lg font-bold">{profile.name}</div>
              <div className="text-sm text-muted-foreground">
                书影音档案共 {movies.length} 部 · 看过 {doneCount} · 在看 {doingCount} · 想看 {wishCount}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={confirmReset ? 'border-destructive text-destructive hover:text-destructive' : 'shrink-0 text-muted-foreground hover:text-destructive'}
              onClick={() => {
                if (confirmReset) {
                  resetAll()
                  setConfirmReset(false)
                  toast.success('已清空全部数据，恢复默认')
                } else {
                  setConfirmReset(true)
                  window.setTimeout(() => setConfirmReset(false), 3500)
                }
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> {confirmReset ? '真的吗？请再次点击' : '清空同步数据'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
