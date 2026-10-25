import { useEffect, useState } from 'react'
import { fetchCredits, type CreditEntry } from './douban'
import type { AwardDef, MovieEntry, Nomination, PersonEntry } from '@/types'

const CACHE_PREFIX = 'douban-credits:'

/** 读取本地缓存的演职员列表（无缓存返回 null） */
export function getCachedCredits(movieId: string): CreditEntry[] | null {
  try {
    const s = localStorage.getItem(CACHE_PREFIX + movieId)
    return s ? (JSON.parse(s) as CreditEntry[]) : null
  } catch {
    return null
  }
}

export interface ResolvedPerson {
  name: string
  image: string
  /** true = 用户手动上传的照片；false = 豆瓣自动匹配 */
  manual: boolean
}

/**
 * 解析某提名的人物照片/姓名：
 * 1. 用户手动上传的照片与姓名最优先；
 * 2. 人物奖项按已填姓名在豆瓣演职员中匹配照片；
 * 3. 导演类奖项未填姓名时自动取影片第一位导演的照片。
 */
export function resolvePerson(award: AwardDef, nomination: Nomination, movie: MovieEntry | undefined): ResolvedPerson {
  const person: PersonEntry | undefined = nomination.person
  if (person?.image) return { name: person.name, image: person.image, manual: true }
  const credits = movie ? getCachedCredits(movie.id) : null
  let matched: CreditEntry | undefined
  if (person?.name && credits) matched = credits.find((c) => c.name === person.name)
  if (!matched && award.kind === 'manual' && !person?.name && award.id.includes('director') && credits) {
    matched = credits.find((c) => c.category === '导演')
  }
  if (matched?.avatar) return { name: person?.name || matched.name, image: matched.avatar, manual: false }
  return { name: person?.name || '', image: '', manual: false }
}

/** 懒加载一批影片的演职员数据到本地缓存，加载完成后 version 变化触发重新渲染 */
export function useCreditsLoader(movieIds: string[]): number {
  const [version, setVersion] = useState(0)
  const key = movieIds.filter(Boolean).sort().join(',')
  useEffect(() => {
    if (!key) return
    let cancelled = false
    const ids = key.split(',')
    void (async () => {
      let changed = false
      for (const id of ids) {
        if (localStorage.getItem(CACHE_PREFIX + id)) continue
        try {
          const list = await fetchCredits(id)
          localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(list))
          changed = true
        } catch {
          /* 单条失败可忽略 */
        }
        await new Promise((r) => setTimeout(r, 250))
        if (cancelled) return
      }
      if (changed && !cancelled) setVersion((v) => v + 1)
    })()
    return () => {
      cancelled = true
    }
  }, [key])
  return version
}
