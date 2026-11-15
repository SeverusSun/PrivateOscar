import { describe, expect, it } from 'vitest'
import { defaultState, type AppState } from '@/lib/storage'
import { AWARDS } from '@/data/awards'
import { selectionLogicalKey, selectionSnapshotSchema } from '@/shared/selection'
import { createSelectionSnapshot } from '@/lib/selection'
import type { MovieEntry } from '@/types'

const movie: MovieEntry = {
  id: '1292052', title: '红辣椒', originalTitle: 'Paprika', year: '2006', poster: 'https://img1.doubanio.com/poster.jpg',
  intro: '', doubanRating: 9.1, ratingCount: 1000, genres: ['动画'],
  directors: [{ id: '1054533', name: '今敏' }], actors: [{ id: '10001', name: '林原惠美' }],
  status: 'done', markedAt: '2026-01-01 12:00:00', userRating: 5, shortComment: '梦境杰作', longReview: '',
}

function state(patch: Partial<AppState> = {}): AppState {
  return {
    ...defaultState,
    profile: { uid: '232857659', name: '秋菊十二', avatar: '', syncedAt: '2026-01-01' },
    movies: [movie], year: 2026, career: false, yearMode: 'marked', ...patch,
  }
}

describe('评选快照协议', () => {
  it('显式保存奥斯卡获奖者、提名、人物与颁奖词', () => {
    const snapshot = createSelectionSnapshot(state({
      results: {
        'best-director': {
          awardId: 'best-director', winner: { movieId: movie.id }, nominations: [{ movieId: movie.id }], person: null,
        },
      },
    }), AWARDS.filter((award) => award.id === 'best-director'), new Date('2026-11-15T13:20:00.000Z'))

    expect(snapshot.selectionId).toMatch(/^[0-9a-f]{32}$/)
    expect(snapshot.awards[0]).toMatchObject({
      awardId: 'best-director', status: 'decided', winnerMovieId: movie.id,
      citation: '梦境杰作', nominations: [{ person: { name: '今敏' } }],
    })
    expect(selectionSnapshotSchema.parse(snapshot)).toEqual(snapshot)
  })

  it('将提名未定与获奖未定保存为状态而非伪电影', () => {
    const snapshot = createSelectionSnapshot(state({
      results: {
        'best-picture': { awardId: 'best-picture', winner: null, nominations: [], person: null, winnerTbd: true },
        favorite: { awardId: 'favorite', winner: null, nominations: [{ movieId: '__TBD__' }], person: null },
      },
    }), AWARDS.filter((award) => ['best-picture', 'favorite'].includes(award.id)))

    expect(snapshot.awards[0]).toMatchObject({ status: 'winner-tbd', winnerMovieId: null, nominations: [] })
    expect(snapshot.awards[1]).toMatchObject({ status: 'nominations-tbd', winnerMovieId: null, nominations: [] })
  })

  it('保存每一个 Top 类别与名次', () => {
    const snapshot = createSelectionSnapshot(state({
      awardMode: 'top', topCategory: '导演', topN: 10,
      topPicks: { 1: { movieId: movie.id, citation: '第一名' } },
    }), [])

    expect(snapshot.topCategory).toEqual({ key: 'director', name: '导演', custom: false })
    expect(snapshot.topPicks[0]).toMatchObject({ rank: 1, citation: '第一名', person: { name: '今敏' } })
    expect(selectionSnapshotSchema.parse(snapshot)).toEqual(snapshot)
  })

  it('业务重复键不包含随机 ID 和上传时间', () => {
    const first = createSelectionSnapshot(state(), [])
    const second = createSelectionSnapshot(state(), [])
    expect(first.selectionId).not.toBe(second.selectionId)
    expect(selectionLogicalKey(first)).toBe(selectionLogicalKey(second))
  })
})
