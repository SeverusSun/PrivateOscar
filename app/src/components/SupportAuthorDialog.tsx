import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SupportAuthorDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>支持作者</DialogTitle>
          <DialogDescription>感谢你喜欢 Private_Oscar，你的支持是作者持续维护的动力。</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <img src="/reward-qrcode.png" alt="支持作者打赏二维码" className="w-60 max-w-full rounded-md border" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
