import { createHash, randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@prisma/client'
import { prisma } from './db.js'
import { config } from './config.js'

export const SESSION_COOKIE = 'community_session'
const SESSION_DAYS = 30

export function serializeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    doubanUid: user.doubanUid,
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string, reply: FastifyReply): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } })
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    expires: expiresAt,
  })
}

export async function currentUser(request: FastifyRequest): Promise<User | null> {
  const token = request.cookies[SESSION_COOKIE]
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  return session.user
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = await currentUser(request)
  if (!user) {
    await reply.code(401).send({ error: '请先登录网站账号' })
    return
  }
  request.communityUser = user
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies[SESSION_COOKIE]
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
}

declare module 'fastify' {
  interface FastifyRequest {
    communityUser?: User
  }
}
