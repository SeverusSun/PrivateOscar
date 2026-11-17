import { createHash } from 'node:crypto'
import { mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import fastify, { type FastifyInstance, type FastifyReply } from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import bcrypt from 'bcryptjs'
import sharp from 'sharp'
import { Prisma } from '@prisma/client'
import { z, type ZodType } from 'zod'
import {
  posterTypeSchema,
  selectionLogicalKey,
  selectionSnapshotSchema,
  type SelectionSnapshot,
} from '../../app/src/shared/selection.js'
import { config } from './config.js'
import { prisma } from './db.js'
import { createSession, currentUser, destroySession, requireAuth, serializeUser } from './auth.js'

const credentialsSchema = z.object({
  username: z.string().trim().regex(/^[A-Za-z0-9_]{3,32}$/, '账号为 3–32 位字母、数字或下划线'),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码最多 72 位'),
  displayName: z.string().trim().min(1).max(100).optional(),
  doubanUid: z.string().trim().min(1).max(100).optional(),
})
const eventSchema = z.object({
  eventId: z.string().regex(/^[0-9a-f]{32}$/),
  eventType: z.enum(['visit', 'export']),
  posterType: posterTypeSchema.nullable().optional(),
  visitorId: z.string().regex(/^[0-9a-f]{32}$/).nullable().optional(),
})
const posterQuerySchema = z.object({
  posterType: posterTypeSchema.optional(),
  scope: z.enum(['career', 'marked', 'release']).optional(),
  scopeYear: z.coerce.number().int().min(1800).max(9999).optional(),
  topCategoryKey: z.string().max(300).optional(),
  owner: z.string().trim().min(1).max(100).optional(),
  mine: z.enum(['1']).optional(),
  sort: z.enum(['likes', 'uploaded-asc', 'uploaded-desc']).default('likes'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
})
const posterYearsQuerySchema = z.object({ scope: z.enum(['marked', 'release']) })
const statsQuerySchema = z.object({ mode: z.enum(['oscars', 'top']) })

type PosterWithSelection = Prisma.PosterGetPayload<{ include: { selection: true } }>
type AggregateRow = {
  awardId: string | null
  awardName: string | null
  topCategoryKey: string | null
  topCategoryName: string | null
  movieId: string
  movieTitle: string
  movieDirectors: string | null
  doubanRating: number | null
  personName: string | null
  count: number | bigint
}

function parse<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value)
}

function selectionData(selection: SelectionSnapshot, contentHash: string) {
  return {
    selectionId: selection.selectionId,
    logicalKey: selectionLogicalKey(selection),
    ownerUid: selection.owner.uid,
    ownerName: selection.owner.name,
    mode: selection.mode,
    scopeType: selection.scope.type,
    scopeYear: selection.scope.year,
    topCategoryKey: selection.topCategory?.key ?? null,
    topCategoryName: selection.topCategory?.name ?? null,
    payloadJson: JSON.stringify(selection),
    contentHash,
    createdAt: new Date(selection.createdAt),
  }
}

function selectionItems(selection: SelectionSnapshot) {
  if (selection.mode === 'top') {
    return selection.topPicks.map((pick) => ({
      entryType: 'top',
      topCategoryKey: selection.topCategory!.key,
      rank: pick.rank,
      movieId: pick.movie.movieId,
      movieTitle: pick.movie.title,
      movieDirectors: pick.movie.directors.map((director) => director.name).join(' / ') || null,
      doubanRating: pick.movie.doubanRating ?? null,
      personName: pick.person?.name ?? null,
    }))
  }
  return selection.awards.filter((award) => award.status === 'decided').map((award) => {
    const winner = award.nominations.find((nomination) => nomination.movie.movieId === award.winnerMovieId)!
    return {
      entryType: 'winner',
      awardId: award.awardId,
      awardName: award.awardName,
      awardKind: award.awardKind,
      required: award.required,
      movieId: winner.movie.movieId,
      movieTitle: winner.movie.title,
      movieDirectors: winner.movie.directors.map((director) => director.name).join(' / ') || null,
      doubanRating: winner.movie.doubanRating ?? null,
      personName: winner.person?.name ?? null,
    }
  })
}

function publicPoster(poster: PosterWithSelection, likedByMe = false) {
  return {
    pictureId: poster.pictureId,
    posterType: poster.posterType,
    imageUrl: `/api/community/media/${poster.fileName}`,
    thumbnailUrl: `/api/community/media/${poster.thumbName}`,
    width: poster.width,
    height: poster.height,
    likeCount: poster.likeCount,
    likedByMe,
    uploadedAt: poster.uploadedAt.toISOString(),
    selection: {
      selectionId: poster.selection.selectionId,
      ownerName: poster.selection.ownerName,
      mode: poster.selection.mode,
      scopeType: poster.selection.scopeType,
      scopeYear: poster.selection.scopeYear,
      topCategoryKey: poster.selection.topCategoryKey,
      topCategoryName: poster.selection.topCategoryName,
    },
  }
}

async function removeFiles(...names: string[]): Promise<void> {
  await Promise.all(names.map((name) => unlink(path.join(config.uploadDir, name)).catch(() => undefined)))
}

async function existingSelection(userId: string, selection: SelectionSnapshot, posterType?: string) {
  return prisma.selection.findFirst({
    where: {
      ownerId: userId,
      logicalKey: selectionLogicalKey(selection),
      ...(posterType ? { posters: { some: { posterType } } } : {}),
    },
    orderBy: { uploadedAt: 'desc' },
    include: { posters: true },
  })
}

function conflictPayload(existing: Prisma.SelectionGetPayload<{ include: { posters: true } }> | null) {
  if (!existing) return null
  return {
    selectionId: existing.selectionId,
    uploadedAt: existing.uploadedAt.toISOString(),
    likeCount: existing.posters.reduce((sum, poster) => sum + poster.likeCount, 0),
    posters: existing.posters.map((poster) => ({ posterType: poster.posterType, likeCount: poster.likeCount })),
  }
}

async function uploadSelection(request: any, reply: FastifyReply) {
  const user = request.communityUser!
  const file = await request.file()
  if (!file) return reply.code(400).send({ error: '缺少 JPEG 文件' })
  const field = (name: string): string => {
    const value = file.fields[name]
    return value && typeof value === 'object' && 'value' in value ? String(value.value) : ''
  }
  let selection: SelectionSnapshot
  let posterType: string
  let pictureId: string
  let buffer: Buffer
  try {
    selection = parse(selectionSnapshotSchema, JSON.parse(field('selection')))
    posterType = parse(posterTypeSchema, field('posterType'))
    pictureId = parse(z.string().regex(/^[0-9a-f]{32}$/), field('pictureId'))
    buffer = await file.toBuffer()
  } catch (error) {
    if (error instanceof SyntaxError) return reply.code(400).send({ error: '评选 JSON 格式错误' })
    throw error
  }
  if (!user.doubanUid || user.doubanUid !== selection.owner.uid) {
    return reply.code(403).send({ error: '当前评选 UID 与网站账号绑定的豆瓣 UID 不一致' })
  }
  if ((selection.mode === 'top') !== (posterType === 'top')) {
    return reply.code(400).send({ error: '图片类型与评选模式不一致' })
  }
  const duplicatePicture = await prisma.poster.findUnique({ where: { pictureId }, include: { selection: true } })
  if (duplicatePicture) {
    if (duplicatePicture.selection.ownerId !== user.id) return reply.code(409).send({ error: '图片标识已存在，请重新导出' })
    return reply.send({ poster: publicPoster(duplicatePicture), idempotent: true })
  }
  const selectionIdOwner = await prisma.selection.findUnique({ where: { selectionId: selection.selectionId } })
  if (selectionIdOwner && selectionIdOwner.ownerId !== user.id) {
    return reply.code(409).send({ error: '评选标识已存在，请重新生成评选数据' })
  }
  if (selectionIdOwner && selectionIdOwner.ownerId === user.id && selectionIdOwner.logicalKey !== selectionLogicalKey(selection)) {
    return reply.code(409).send({ error: '评选标识已被另一份评选使用，请重新导出' })
  }

  const metadata = await sharp(buffer, { limitInputPixels: 80_000_000 }).metadata()
  if (metadata.format !== 'jpeg' || !metadata.width || !metadata.height) {
    return reply.code(400).send({ error: '上传文件不是有效 JPEG 图片' })
  }
  const fileName = `${pictureId}.jpg`
  const thumbName = `${pictureId}-thumb.jpg`
  await mkdir(config.uploadDir, { recursive: true })
  await sharp(buffer, { limitInputPixels: 80_000_000 })
    .resize({ width: 640, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(path.join(config.uploadDir, thumbName))
  await sharp(buffer, { limitInputPixels: 80_000_000 }).toFile(path.join(config.uploadDir, fileName))

  const conflictMode = field('conflictMode') || 'none'
  if (!['none', 'new', 'overwrite'].includes(conflictMode)) {
    await removeFiles(fileName, thumbName)
    return reply.code(400).send({ error: '无效的上传冲突处理方式' })
  }
  const latestExisting = await existingSelection(user.id, selection)
  const conflictingExisting = await existingSelection(user.id, selection, posterType)
  if (conflictingExisting && conflictMode === 'none') {
    await removeFiles(fileName, thumbName)
    return reply.code(409).send({ error: '已有同类型评选和图片类型', conflict: conflictPayload(conflictingExisting) })
  }
  if (conflictMode === 'overwrite' && !conflictingExisting) {
    await removeFiles(fileName, thumbName)
    return reply.code(400).send({ error: '当前图片类型没有可覆盖的旧海报，请重新检测' })
  }
  const existing = conflictMode === 'new' ? null : conflictMode === 'overwrite' ? conflictingExisting : latestExisting

  const contentHash = createHash('sha256').update(JSON.stringify(selection)).digest('hex')
  const oldFiles: string[] = []
  try {
    const poster = await prisma.$transaction(async (tx) => {
      let internalSelectionId: string
      if (existing) {
        internalSelectionId = existing.id
        if (conflictMode === 'overwrite') {
          await tx.like.deleteMany({ where: { poster: { selectionId: existing.id } } })
          await tx.poster.updateMany({ where: { selectionId: existing.id }, data: { likeCount: 0 } })
        }
        const replaced = await tx.poster.findUnique({
          where: { selectionId_posterType: { selectionId: existing.id, posterType } },
        })
        if (replaced) {
          oldFiles.push(replaced.fileName, replaced.thumbName)
          await tx.poster.delete({ where: { id: replaced.id } })
        }
        await tx.selectionItem.deleteMany({ where: { selectionId: existing.id } })
        await tx.selection.update({
          where: { id: existing.id },
          data: { ...selectionData(selection, contentHash), uploadedAt: new Date() },
        })
      } else {
        const created = await tx.selection.create({
          data: { ...selectionData(selection, contentHash), ownerId: user.id },
        })
        internalSelectionId = created.id
      }
      await tx.selectionItem.createMany({
        data: selectionItems(selection).map((item) => ({ ...item, selectionId: internalSelectionId })),
      })
      return tx.poster.create({
        data: {
          pictureId, selectionId: internalSelectionId, posterType, fileName, thumbName,
          width: metadata.width!, height: metadata.height!, sizeBytes: buffer.length,
        },
        include: { selection: true },
      })
    })
    if (oldFiles.length) await removeFiles(...oldFiles)
    return reply.code(201).send({ poster: publicPoster(poster), overwritten: conflictMode === 'overwrite' })
  } catch (error) {
    await removeFiles(fileName, thumbName)
    throw error
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  await mkdir(config.uploadDir, { recursive: true })
  const app = fastify({ logger: !config.isTest, bodyLimit: 1024 * 1024 })
  await app.register(cookie)
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 4 } })
  await app.register(rateLimit, { max: config.isTest ? 10_000 : 300, timeWindow: '1 minute' })
  await app.register(fastifyStatic, { root: config.uploadDir, prefix: '/api/community/media/', decorateReply: false })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: error.issues[0]?.message ?? '请求参数错误', issues: error.issues })
    }
    if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({ error: 'JPEG 不能超过 25 MB' })
    }
    app.log.error(error)
    return reply.code(500).send({ error: '服务器处理失败，请稍后重试' })
  })

  app.get('/api/community/health', async () => ({ ok: true }))

  app.post('/api/community/auth/register', {
    config: { rateLimit: { max: config.isTest ? 10_000 : 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = parse(credentialsSchema, request.body)
    const passwordHash = await bcrypt.hash(body.password, 12)
    try {
      const user = await prisma.user.create({
        data: {
          username: body.username,
          passwordHash,
          displayName: body.displayName ?? body.username,
          doubanUid: body.doubanUid ?? null,
        },
      })
      await createSession(user.id, reply)
      return reply.code(201).send({ user: serializeUser(user) })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return reply.code(409).send({ error: '网站账号或豆瓣 UID 已被绑定' })
      }
      throw error
    }
  })

  app.post('/api/community/auth/login', {
    config: { rateLimit: { max: config.isTest ? 10_000 : 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = parse(credentialsSchema.pick({ username: true, password: true, doubanUid: true }), request.body)
    const user = await prisma.user.findUnique({ where: { username: body.username } })
    if (!user || !await bcrypt.compare(body.password, user.passwordHash)) {
      return reply.code(401).send({ error: '账号或密码错误' })
    }
    if (body.doubanUid && user.doubanUid && body.doubanUid !== user.doubanUid) {
      return reply.code(409).send({ error: '该网站账号已绑定另一个豆瓣 UID' })
    }
    const updated = !user.doubanUid && body.doubanUid
      ? await prisma.user.update({ where: { id: user.id }, data: { doubanUid: body.doubanUid } })
      : user
    await createSession(user.id, reply)
    return { user: serializeUser(updated) }
  })

  app.post('/api/community/auth/logout', async (request, reply) => {
    await destroySession(request, reply)
    return { ok: true }
  })

  app.get('/api/community/auth/me', async (request) => {
    const user = await currentUser(request)
    return { user: user ? serializeUser(user) : null }
  })

  app.post('/api/community/selections/precheck', { preHandler: requireAuth }, async (request, reply) => {
    const body = parse(z.object({ selection: selectionSnapshotSchema, posterType: posterTypeSchema }), request.body)
    const { selection, posterType } = body
    const user = request.communityUser!
    if (!user.doubanUid || user.doubanUid !== selection.owner.uid) {
      return reply.code(403).send({ error: '当前评选 UID 与网站账号绑定的豆瓣 UID 不一致' })
    }
    return { conflict: conflictPayload(await existingSelection(user.id, selection, posterType)) }
  })

  app.post('/api/community/selections/upload', { preHandler: requireAuth }, uploadSelection)

  app.delete('/api/community/selections/:selectionId', { preHandler: requireAuth }, async (request, reply) => {
    const { selectionId } = parse(z.object({ selectionId: z.string().regex(/^[0-9a-f]{32}$/) }), request.params)
    const selection = await prisma.selection.findUnique({ where: { selectionId }, include: { posters: true } })
    if (!selection) return reply.code(404).send({ error: '评选不存在' })
    if (selection.ownerId !== request.communityUser!.id) return reply.code(403).send({ error: '只能删除自己的评选' })
    await prisma.selection.delete({ where: { id: selection.id } })
    await removeFiles(...selection.posters.flatMap((poster) => [poster.fileName, poster.thumbName]))
    return { ok: true }
  })

  app.get('/api/community/posters/years', async (request) => {
    const { scope } = parse(posterYearsQuerySchema, request.query)
    const rows = await prisma.selection.findMany({
      where: { scopeType: scope, scopeYear: { not: null }, posters: { some: {} } },
      select: { scopeYear: true },
      distinct: ['scopeYear'],
      orderBy: { scopeYear: 'desc' },
    })
    return { years: rows.flatMap((row) => row.scopeYear === null ? [] : [row.scopeYear]) }
  })

  app.get('/api/community/posters', async (request) => {
    const query = parse(posterQuerySchema, request.query)
    const user = query.mine ? await currentUser(request) : null
    if (query.mine && !user) return { items: [], total: 0, page: query.page, pageSize: query.pageSize, requiresAuth: true }
    const where: Prisma.PosterWhereInput = {
      ...(query.posterType ? { posterType: query.posterType } : {}),
      selection: {
        ...(query.topCategoryKey ? { topCategoryKey: query.topCategoryKey } : {}),
        ...(query.scope ? { scopeType: query.scope } : {}),
        ...(query.scopeYear ? { scopeYear: query.scopeYear } : {}),
        ...(query.mine ? { ownerId: user!.id } : {}),
        ...(query.owner ? { OR: [{ ownerUid: query.owner }, { ownerName: { contains: query.owner } }] } : {}),
      },
    }
    const orderBy: Prisma.PosterOrderByWithRelationInput[] = query.sort === 'likes'
      ? [{ likeCount: 'desc' }, { uploadedAt: 'desc' }]
      : [{ uploadedAt: query.sort === 'uploaded-asc' ? 'asc' : 'desc' }]
    const [total, posters] = await Promise.all([
      prisma.poster.count({ where }),
      prisma.poster.findMany({
        where, orderBy, include: { selection: true },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    const liked = user ? await prisma.like.findMany({
      where: { userId: user.id, posterId: { in: posters.map((poster) => poster.id) } },
      select: { posterId: true },
    }) : []
    const likedIds = new Set(liked.map((item) => item.posterId))
    return {
      items: posters.map((poster) => publicPoster(poster, likedIds.has(poster.id))),
      total, page: query.page, pageSize: query.pageSize, requiresAuth: false,
    }
  })

  app.post('/api/community/posters/:pictureId/like', { preHandler: requireAuth }, async (request, reply) => {
    const { pictureId } = parse(z.object({ pictureId: z.string().regex(/^[0-9a-f]{32}$/) }), request.params)
    const poster = await prisma.poster.findUnique({ where: { pictureId } })
    if (!poster) return reply.code(404).send({ error: '海报不存在' })
    await prisma.$transaction(async (tx) => {
      const created = await tx.$executeRaw`
        INSERT OR IGNORE INTO "Like" (userId, posterId) VALUES (${request.communityUser!.id}, ${poster.id})
      `
      if (created > 0) await tx.poster.update({ where: { id: poster.id }, data: { likeCount: { increment: 1 } } })
    })
    const updated = await prisma.poster.findUnique({ where: { id: poster.id } })
    return { liked: true, likeCount: updated!.likeCount }
  })

  app.delete('/api/community/posters/:pictureId/like', { preHandler: requireAuth }, async (request, reply) => {
    const { pictureId } = parse(z.object({ pictureId: z.string().regex(/^[0-9a-f]{32}$/) }), request.params)
    const poster = await prisma.poster.findUnique({ where: { pictureId } })
    if (!poster) return reply.code(404).send({ error: '海报不存在' })
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.like.deleteMany({ where: { userId: request.communityUser!.id, posterId: poster.id } })
      if (deleted.count > 0) await tx.poster.update({ where: { id: poster.id }, data: { likeCount: { decrement: 1 } } })
    })
    const updated = await prisma.poster.findUnique({ where: { id: poster.id } })
    return { liked: false, likeCount: updated!.likeCount }
  })

  app.get('/api/community/stats/selections', async (request) => {
    const { mode } = parse(statsQuerySchema, request.query)
    const entryType = mode === 'oscars' ? 'winner' : 'top'
    const rows = await prisma.$queryRaw<AggregateRow[]>`
      SELECT si.awardId, si.awardName, si.topCategoryKey, s.topCategoryName,
             si.movieId, si.movieTitle, MAX(si.movieDirectors) AS movieDirectors,
             MAX(si.doubanRating) AS doubanRating, si.personName, COUNT(*) AS count
      FROM SelectionItem AS si
      JOIN Selection AS s ON s.id = si.selectionId
      WHERE si.entryType = ${entryType}
      GROUP BY si.awardId, si.awardName, si.topCategoryKey, s.topCategoryName,
               si.movieId, si.movieTitle, si.personName
    `
    const groups = new Map<string, {
      id: string
      name: string
      entries: {
        movieId: string
        title: string
        directors: string
        doubanRating: number | null
        personName: string | null
        count: number
      }[]
    }>()
    for (const row of rows) {
      const id = mode === 'oscars' ? row.awardId! : row.topCategoryKey!
      const name = mode === 'oscars' ? row.awardName! : row.topCategoryName!
      if (!groups.has(id)) groups.set(id, { id, name, entries: [] })
      groups.get(id)!.entries.push({
        movieId: row.movieId,
        title: row.movieTitle,
        directors: row.movieDirectors ?? '',
        doubanRating: row.doubanRating,
        personName: row.personName,
        count: Number(row.count),
      })
    }
    return {
      mode,
      groups: [...groups.values()].map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-CN')).slice(0, 10),
      })),
    }
  })

  app.post('/api/community/events', async (request, reply) => {
    const event = parse(eventSchema, request.body)
    if (event.eventType === 'visit' && !event.visitorId) return reply.code(400).send({ error: '访问事件缺少访客标识' })
    if (event.eventType === 'export' && !event.posterType) return reply.code(400).send({ error: '导出事件缺少图片类型' })
    try {
      await prisma.siteEvent.create({ data: event })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error
    }
    return reply.code(201).send({ ok: true })
  })

  app.get('/api/community/stats/site', async () => {
    const visitors = await prisma.$queryRaw<{ count: number | bigint }[]>`
      SELECT COUNT(DISTINCT visitorId) AS count FROM SiteEvent WHERE eventType = 'visit' AND visitorId IS NOT NULL
    `
    const exports = await prisma.$queryRaw<{ posterType: string; count: number | bigint }[]>`
      SELECT posterType, COUNT(*) AS count FROM SiteEvent WHERE eventType = 'export' AND posterType IS NOT NULL GROUP BY posterType
    `
    const counts = Object.fromEntries(exports.map((row) => [row.posterType, Number(row.count)]))
    return {
      visitorCount: Number(visitors[0]?.count ?? 0),
      exportCounts: { oscar: counts.oscar ?? 0, nominations: counts.nominations ?? 0, top: counts.top ?? 0 },
    }
  })

  return app
}
