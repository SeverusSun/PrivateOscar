import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCommunityAuth } from '@/lib/communityAuthContext'
import { useStore } from '@/store'

export default function AuthDialog() {
  const { authOpen, setAuthOpen, authenticate } = useCommunityAuth()
  const { profile } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await authenticate(mode, {
        username: username.trim(), password,
        displayName: displayName.trim() || profile?.name || username.trim(),
        doubanUid: profile?.uid,
      })
      setPassword('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={(open) => !busy && setAuthOpen(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? '登录社区账号' : '注册社区账号'}</DialogTitle>
          <DialogDescription>
            上传、覆盖和点赞以网站账号为准。{profile ? `当前同步 UID 将绑定为 ${profile.uid}。` : '注册时可暂不绑定豆瓣 UID。'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="community-username">网站账号</Label>
            <Input id="community-username" value={username} onChange={(event) => setUsername(event.target.value)}
              placeholder="3–32 位字母、数字或下划线" autoComplete="username" required minLength={3} maxLength={32} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="community-password">密码</Label>
            <Input id="community-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={72} />
          </div>
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="community-display-name">公开显示名称</Label>
              <Input id="community-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)}
                placeholder={profile?.name ?? '用于人人奥斯卡展示'} required maxLength={100} />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? '登录' : '注册并登录'}
          </Button>
        </form>
        <DialogFooter className="sm:justify-center">
          <Button variant="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} disabled={busy}>
            {mode === 'login' ? '没有账号？注册一个' : '已有账号？返回登录'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
