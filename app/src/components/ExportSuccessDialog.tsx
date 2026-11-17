import { useState } from 'react'
import { Heart, Share2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import SupportAuthorDialog from '@/components/SupportAuthorDialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: () => void
}

function copySiteUrl() {
  const url = window.location.href
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(url)
  }
  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  return copied ? Promise.resolve() : Promise.reject(new Error('copy failed'))
}

export default function ExportSuccessDialog({ open, onOpenChange, onUpload }: Props) {
  const [supportOpen, setSupportOpen] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function shareSite() {
    if (sharing) return
    setSharing(true)
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Private_Oscar（私人奥斯卡）',
            text: '基于豆瓣书影音档案，生成属于你的私人奥斯卡海报。',
            url: window.location.href,
          })
          return
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === 'AbortError') return
        }
      }
      await copySiteUrl()
      toast.success('本站链接已复制，可以粘贴分享')
    } catch {
      toast.error('分享失败，请复制浏览器地址分享本站')
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>海报导出成功</DialogTitle>
            <DialogDescription>JPEG 图片已保存到本地。你还可以支持作者、上传海报，或把本站分享给朋友。</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="min-h-11 w-full sm:flex-1"
              onClick={() => {
                onOpenChange(false)
                setSupportOpen(true)
              }}
            >
              <Heart className="mr-2 h-4 w-4" />
              支持作者
            </Button>
            <Button
              className="min-h-11 w-full sm:flex-1"
              onClick={() => {
                onOpenChange(false)
                onUpload()
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              上传海报
            </Button>
            <Button variant="outline" className="min-h-11 w-full sm:flex-1" onClick={() => void shareSite()} disabled={sharing}>
              <Share2 className="mr-2 h-4 w-4" />
              {sharing ? '分享中…' : '分享本站'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <SupportAuthorDialog
        open={supportOpen}
        onOpenChange={(next) => {
          setSupportOpen(next)
          if (!next) onOpenChange(true)
        }}
      />
    </>
  )
}
