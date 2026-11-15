import { createContext, useContext } from 'react'
import type { CommunityUser } from '@/lib/communityApi'

export interface Credentials {
  username: string
  password: string
  displayName?: string
  doubanUid?: string
}

interface CommunityAuthContextValue {
  user: CommunityUser | null
  loading: boolean
  authOpen: boolean
  setAuthOpen: (open: boolean) => void
  openAuth: () => void
  authenticate: (mode: 'login' | 'register', credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
}

export const CommunityAuthContext = createContext<CommunityAuthContextValue | null>(null)

export function useCommunityAuth(): CommunityAuthContextValue {
  const context = useContext(CommunityAuthContext)
  if (!context) throw new Error('useCommunityAuth 必须在 CommunityAuthProvider 内使用')
  return context
}
