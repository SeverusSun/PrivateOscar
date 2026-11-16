import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCommunityAuth } from '@/lib/communityAuthContext'

export default function CommunityAccountControls() {
  const { user, loading, openAuth, logout } = useCommunityAuth()

  return (
    <div className="flex flex-wrap items-center gap-3">
      {user ? (
        <>
          <span className="text-sm font-medium">已登录：{user.displayName}</span>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            <LogOut className="mr-1.5 h-4 w-4" />退出社区账号
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={openAuth} disabled={loading}>登录社区账号</Button>
      )}
    </div>
  )
}
