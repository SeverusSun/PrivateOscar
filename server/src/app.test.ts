import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app.js'
import { prisma } from './db.js'
import { createUuid32, type SelectionSnapshot } from '../../app/src/shared/selection.js'

let app: FastifyInstance
let jpeg: Buffer
let sequence = 0

beforeAll(async () => {
  app = await buildApp()
  jpeg = await sharp({ create: { width: 64, height: 96, channels: 3, background: '#1b4332' } }).jpeg().toBuffer()
})

beforeEach(async () => {
  await prisma.siteEvent.deleteMany()
  await prisma.like.deleteMany()
  await prisma.poster.deleteMany()
  await prisma.selectionItem.deleteMany()
  await prisma.selection.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
})

async function register(doubanUid = '232857659'): Promise<string> {
  sequence += 1
  const response = await app.inject({
    method: 'POST', url: '/api/community/auth/register',
    payload: { username: `user_${sequence}`, password: 'password123', displayName: `用户 ${sequence}`, doubanUid },
  })
  expect(response.statusCode).toBe(201)
  const cookie = response.headers['set-cookie']
  return (Array.isArray(cookie) ? cookie[0] : cookie)!.split(';')[0]
}

function movie(id: string, title = '红辣椒') {
  return {
    movieId: id, title, year: '2006', directors: [{ id: 'director', name: '今敏' }], actors: [],
  }
}

function oscarSelection(movieId = '1292052'): SelectionSnapshot {
  return {
    schemaVersion: 1, selectionId: createUuid32(), owner: { uid: '232857659', name: '秋菊十二' },
    mode: 'oscars', scope: { type: 'marked', year: 2026 }, topCategory: null,
    createdAt: new Date().toISOString(),
    awards: [{
      awardId: 'best-director', awardName: '最佳导演', awardKind: 'manual', required: true,
      status: 'decided', winnerMovieId: movieId,
      nominations: [{ movie: movie(movieId), person: { name: '今敏', doubanId: 'director' } }], citation: '梦境杰作',
    }],
    topPicks: [],
  }
}

function topSelection(movieId: string, categoryKey = 'best', categoryName = '最佳'): SelectionSnapshot {
  return {
    schemaVersion: 1, selectionId: createUuid32(), owner: { uid: '232857659', name: '秋菊十二' },
    mode: 'top', scope: { type: 'marked', year: 2026 },
    topCategory: { key: categoryKey, name: categoryName, custom: false }, createdAt: new Date().toISOString(), awards: [],
    topPicks: [{ rank: 1, movie: movie(movieId, `影片 ${movieId}`), person: null, citation: null }],
  }
}

function multipart(selection: SelectionSnapshot, posterType: string, pictureId: string, conflictMode = 'none') {
  const boundary = '----PrivateOscarTestBoundary'
  const chunks: Buffer[] = []
  const addField = (name: string, value: string) => {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
  }
  addField('selection', JSON.stringify(selection))
  addField('posterType', posterType)
  addField('pictureId', pictureId)
  addField('conflictMode', conflictMode)
  chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="poster.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`))
  chunks.push(jpeg, Buffer.from(`\r\n--${boundary}--\r\n`))
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

async function upload(cookie: string, selection: SelectionSnapshot, posterType = 'oscar', conflictMode = 'none') {
  const pictureId = createUuid32()
  const response = await app.inject({
    method: 'POST', url: '/api/community/selections/upload', headers: { cookie, ...multipart(selection, posterType, pictureId, conflictMode).headers },
    payload: multipart(selection, posterType, pictureId, conflictMode).payload,
  })
  return { response, pictureId }
}

describe('社区 API', () => {
  it('上传、重复检测、点赞与覆盖清零形成完整闭环', async () => {
    const owner = await register()
    const selection = oscarSelection()
    const precheck = await app.inject({ method: 'POST', url: '/api/community/selections/precheck', headers: { cookie: owner }, payload: { selection, posterType: 'oscar' } })
    expect(precheck.json()).toEqual({ conflict: null })

    const first = await upload(owner, selection)
    expect(first.response.statusCode).toBe(201)
    const other = await register('other-uid')
    for (let i = 0; i < 2; i++) {
      const liked = await app.inject({ method: 'POST', url: `/api/community/posters/${first.pictureId}/like`, headers: { cookie: other } })
      expect(liked.json()).toEqual({ liked: true, likeCount: 1 })
    }

    const conflict = await app.inject({ method: 'POST', url: '/api/community/selections/precheck', headers: { cookie: owner }, payload: { selection: oscarSelection(), posterType: 'oscar' } })
    expect(conflict.json().conflict.likeCount).toBe(1)

    const replacedSelection = oscarSelection()
    const replaced = await upload(owner, replacedSelection, 'oscar', 'overwrite')
    expect(replaced.response.statusCode).toBe(201)
    expect(replaced.response.json().poster.likeCount).toBe(0)
    const oldPoster = await app.inject({ url: `/api/community/media/${first.pictureId}.jpg` })
    expect(oldPoster.statusCode).toBe(404)

    const unique = await upload(owner, oscarSelection(), 'oscar', 'new')
    expect(unique.response.statusCode).toBe(201)
    const posters = await app.inject({ url: '/api/community/posters?posterType=oscar&scope=marked&sort=likes' })
    expect(posters.json().total).toBe(2)
  })

  it('按图片类型检测重复，允许补充提名名单并保留原海报点赞', async () => {
    const owner = await register()
    const first = await upload(owner, oscarSelection(), 'oscar')
    expect(first.response.statusCode).toBe(201)
    const other = await register('other-uid')
    await app.inject({ method: 'POST', url: `/api/community/posters/${first.pictureId}/like`, headers: { cookie: other } })

    const nominationsSelection = oscarSelection()
    const nominationsPrecheck = await app.inject({
      method: 'POST', url: '/api/community/selections/precheck', headers: { cookie: owner },
      payload: { selection: nominationsSelection, posterType: 'nominations' },
    })
    expect(nominationsPrecheck.json()).toEqual({ conflict: null })
    const oscarPrecheck = await app.inject({
      method: 'POST', url: '/api/community/selections/precheck', headers: { cookie: owner },
      payload: { selection: oscarSelection(), posterType: 'oscar' },
    })
    expect(oscarPrecheck.json().conflict).not.toBeNull()

    const nominations = await upload(owner, nominationsSelection, 'nominations')
    expect(nominations.response.statusCode).toBe(201)
    expect(nominations.response.json().poster.selection.selectionId).toBe(nominationsSelection.selectionId)
    expect(await prisma.selection.count()).toBe(1)
    const posters = await app.inject({ url: '/api/community/posters?sort=uploaded-asc' })
    expect(posters.json().total).toBe(2)
    expect(posters.json().items.find((poster: { pictureId: string }) => poster.pictureId === first.pictureId).likeCount).toBe(1)

    const repeated = await upload(owner, oscarSelection(), 'nominations')
    expect(repeated.response.statusCode).toBe(409)
  })

  it('支持豆瓣 UID 精确检索和显示名模糊搜索，且不公开 UID', async () => {
    const cookie = await register()
    expect((await upload(cookie, oscarSelection())).response.statusCode).toBe(201)

    const byUid = await app.inject({ url: '/api/community/posters?owner=232857659' })
    expect(byUid.json().total).toBe(1)
    expect(byUid.body).not.toContain('ownerUid')
    const byName = await app.inject({ url: `/api/community/posters?owner=${encodeURIComponent('秋菊')}` })
    expect(byName.json().total).toBe(1)
    const byPartialUid = await app.inject({ url: '/api/community/posters?owner=23285765' })
    expect(byPartialUid.json().total).toBe(0)
    const missing = await app.inject({ url: `/api/community/posters?owner=${encodeURIComponent('不存在的用户')}` })
    expect(missing.json().total).toBe(0)
  })

  it('拒绝以其他豆瓣 UID 上传', async () => {
    const cookie = await register('another-uid')
    const result = await upload(cookie, oscarSelection())
    expect(result.response.statusCode).toBe(403)
  })

  it('奥斯卡人物与各 Top 类别分别统计，并只返回前十名', async () => {
    const cookie = await register()
    expect((await upload(cookie, oscarSelection())).response.statusCode).toBe(201)
    for (let i = 0; i < 12; i++) {
      expect((await upload(cookie, topSelection(`best-${i}`), 'top', 'new')).response.statusCode).toBe(201)
    }
    expect((await upload(cookie, topSelection('favorite-1', 'favorite', '最爱'), 'top', 'new')).response.statusCode).toBe(201)

    const oscars = await app.inject({ url: '/api/community/stats/selections?mode=oscars' })
    expect(oscars.json().groups[0].entries[0]).toMatchObject({ title: '红辣椒', personName: '今敏', count: 1 })
    const top = await app.inject({ url: '/api/community/stats/selections?mode=top' })
    const best = top.json().groups.find((group: { id: string }) => group.id === 'best')
    const favorite = top.json().groups.find((group: { id: string }) => group.id === 'favorite')
    expect(best.entries).toHaveLength(10)
    expect(best.entries.every((entry: { count: number }) => entry.count === 1)).toBe(true)
    expect(favorite.entries[0]).toMatchObject({ title: '影片 favorite-1', count: 1 })
  })

  it('访问去重、导出分类和事件幂等有效', async () => {
    const visitorId = createUuid32()
    const visit = { eventId: createUuid32(), eventType: 'visit', visitorId }
    await app.inject({ method: 'POST', url: '/api/community/events', payload: visit })
    await app.inject({ method: 'POST', url: '/api/community/events', payload: { ...visit, eventId: createUuid32() } })
    const exportEvent = { eventId: createUuid32(), eventType: 'export', posterType: 'oscar' }
    await app.inject({ method: 'POST', url: '/api/community/events', payload: exportEvent })
    await app.inject({ method: 'POST', url: '/api/community/events', payload: exportEvent })
    const stats = await app.inject({ url: '/api/community/stats/site' })
    expect(stats.json()).toEqual({ visitorCount: 1, exportCounts: { oscar: 1, nominations: 0, top: 0 } })
  })
})
