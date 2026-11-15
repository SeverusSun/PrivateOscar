import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { communityApi, CommunityApiError, type ExportDraft, type UploadConflict } from '@/lib/communityApi'
import { useCommunityAuth } from '@/lib/communityAuth'

interface Props {
  draft: ExportDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UploadPosterDialog({ draft, open, onOpenChange }: Props) {
  const { user, openAuth } = useCommunityAuth()
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState<UploadConflict | null>(null)
  const [done, setDone] = useState(false)
  const previewUrl = useMemo(() => draft ? URL.createObjectURL(draft.blob) : '', [draft])

  useEffect(() => {
    if (open) { setConflict(null); setDone(false) }
  }, [open, draft])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  async function performUpload(conflictMode: 'none' | 'new' | 'overwrite') {
    if (!draft) return
    setBusy(true)
    try {
      await communityApi.upload(draft, conflictMode)
      setConflict(null)
      setDone(true)
      toast.success(conflictMode === 'overwrite' ? '已覆盖，原点赞已清零' : '海报已上传到人人奥斯卡')
    } catch (cause) {
      if (cause instanceof CommunityApiError && cause.conflict) setConflict(cause.conflict)
      else toast.error(cause instanceof Error ? cause.message : '上传失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  async function startUpload() {
    if (!user) { openAuth(); return }
    if (!draft?.selection) { toast.error('请先在「同步」页同步豆瓣账户，再上传评选'); return }
    setBusy(true)
    try {
      const result = await communityApi.precheck(draft.selection)
      if (result.conflict) setConflict(result.conflict)
      else await performUpload('none')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '检测失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{done ? '上传完成' : '将海报上传网站'}</DialogTitle>
          <DialogDescription>
            JPEG 已下载到本地。上传后，海报、用户名、评选结果及颁奖词将公开展示；豆瓣 UID 不公开展示。
          </DialogDescription>
        </DialogHeader>
        {draft && !done && (
          <div className="flex items-center gap-4 rounded-md border bg-muted/30 p-3">
            <img src={previewUrl} alt="本次导出的海报预览" className="h-24 w-16 rounded-sm object-cover" />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{draft.filename}</p>
              <p className="mt-1 text-muted-foreground">{user ? `上传账号：${user.displayName}` : '上传前需要登录社区账号'}</p>
            </div>
          </div>
        )}
        {conflict && (
          <div role="alert" className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">已有同类型评选</p>
            <p>上次上传：{new Date(conflict.uploadedAt).toLocaleString('zh-CN')}，现有点赞 {conflict.likeCount}。</p>
            <p className="font-bold text-red-700">选择“覆盖”后，旧评选关联海报的点赞将全部清零，且无法恢复。</p>
            <p>选择“上传唯一评选结果”会保留旧评选，另建一份独立结果。</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="destructive" onClick={() => performUpload('overwrite')} disabled={busy}>
                覆盖并清零点赞
              </Button>
              <Button variant="outline" onClick={() => performUpload('new')} disabled={busy}>上传唯一评选结果</Button>
            </div>
          </div>
        )}
        {done ? (
          <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-green-900">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <p className="text-sm">上传成功，可在「人人奥斯卡 → 海报展示 → 我的」中查看。</p>
          </div>
        ) : !conflict && (
          <p className="text-xs text-muted-foreground">上传失败不会影响已下载的本地图片，关闭弹窗也不会自动上传。</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{done ? '完成' : '关闭'}</Button>
          {!done && !conflict && (
            <Button onClick={startUpload} disabled={busy || !draft}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : user ? <Upload className="mr-2 h-4 w-4" /> : null}
              {user ? '检测并上传' : '登录后上传'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
