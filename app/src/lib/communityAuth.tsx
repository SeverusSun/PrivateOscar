import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { communityApi, type CommunityUser } from '@/lib/communityApi'
import { flushCommunityEvents, trackCommunityVisit } from '@/lib/communityEvents'
import AuthDialog from '@/components/AuthDialog'

interface Credentials {
  username: string
  password: string
  displayName?: string
  doubanUid?: string
}

interface CommunityAuthContext {
  user: CommunityUser | null
  loading: boolean
  authOpen: boolean
  setAuthOpen: (open: boolean) => void
  openAuth: () => void
  authenticate: (mode: 'login' | 'register', credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
}

const Context = createContext<CommunityAuthContext | null>(null)

export function CommunityAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CommunityUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    communityApi.me().then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setLoading(false))
    trackCommunityVisit()
    const flush = () => { void flushCommunityEvents() }
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  async function authenticate(mode: 'login' | 'register', credentials: Credentials) {
    const result = mode === 'register'
      ? await communityApi.register({ ...credentials, displayName: credentials.displayName!.trim() })
      : await communityApi.login(credentials)
    setUser(result.user)
    setAuthOpen(false)
    toast.success(mode === 'register' ? '注册并登录成功' : '登录成功')
  }

  async function logout() {
    await communityApi.logout()
    setUser(null)
    toast.success('已退出社区账号')
  }

  return (
    <Context.Provider value={{ user, loading, authOpen, setAuthOpen, openAuth: () => setAuthOpen(true), authenticate, logout }}>
      {children}
      <AuthDialog />
    </Context.Provider>
  )
}

export function useCommunityAuth(): CommunityAuthContext {
  const context = useContext(Context)
  if (!context) throw new Error('useCommunityAuth 必须在 CommunityAuthProvider 内使用')
  return context
}
