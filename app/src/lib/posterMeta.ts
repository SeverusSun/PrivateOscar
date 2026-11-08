/**
 * 海报元数据嵌入：导出 JPEG 时写入筛选信息（EXIF）
 * - Artist（0x013B）= 用户名
 * - UserComment（0x9286）= JSON 元数据（海报类型 / 评选范围 / Top 类别等）
 * 容量说明：EXIF 字符串为变长数据段，元数据仅一两百字节，对海报文件大小可忽略。
 */

export interface PosterMeta {
  /** 豆瓣用户名 */
  user: string
  /** 海报类型：奥斯卡海报 / 提名名单 / Top 榜 */
  posterType: 'oscar' | 'nominations' | 'top'
  /** 评选范围：年份或 career（光影生涯） */
  scope: string
  /** Top 榜类别（仅 Top 榜海报） */
  topCategory?: string
}

export function posterMetaJson(meta: PosterMeta): string {
  return JSON.stringify({
    app: 'Private_Oscar',
    user: meta.user,
    posterType: meta.posterType,
    scope: meta.scope,
    topCategory: meta.topCategory ?? '',
  })
}

/** 将元数据以 EXIF 形式嵌入 JPEG dataUrl，返回新的 dataUrl */
export function embedJpegMeta(dataUrl: string, meta: PosterMeta): string {
  const bytes = dataUrlToBytes(dataUrl)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return dataUrl
  const app1 = buildExifApp1(meta.user, posterMetaJson(meta))
  const out = new Uint8Array(2 + app1.length + (bytes.length - 2))
  out.set(bytes.subarray(0, 2), 0)
  out.set(app1, 2)
  out.set(bytes.subarray(2), 2 + app1.length)
  return bytesToDataUrl(out, 'image/jpeg')
}

/* ---------- base64 工具 ---------- */

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mime};base64,` + btoa(bin)
}

/* ---------- EXIF APP1 段（Artist + UserComment） ---------- */

function buildExifApp1(artist: string, userComment: string): Uint8Array {
  const enc = new TextEncoder()
  const artistB = enc.encode(artist + '\0')
  const commentBody = enc.encode(userComment)
  const commentB = new Uint8Array(8 + commentBody.length)
  commentB.set([0x41, 0x53, 0x43, 0x49, 0x49, 0, 0, 0], 0) // "ASCII\0\0\0" 前缀（内容实为 UTF-8 字节）
  commentB.set(commentBody, 8)

  // TIFF 布局（小端）：头(8) + IFD0 + Artist 数据 + ExifIFD + UserComment 数据
  const ifd0Size = 2 + 2 * 12 + 4
  const artistOffset = 8 + ifd0Size
  const exifIfdOffset = artistOffset + artistB.length
  const exifSize = 2 + 1 * 12 + 4
  const commentOffset = exifIfdOffset + exifSize
  const tiff = new Uint8Array(commentOffset + commentB.length)
  const dv = new DataView(tiff.buffer)

  tiff.set([0x49, 0x49], 0) // "II" 小端序
  dv.setUint16(2, 0x2a, true)
  dv.setUint32(4, 8, true)
  // IFD0：Artist + ExifIFD 指针
  dv.setUint16(8, 2, true)
  let o = 10
  dv.setUint16(o, 0x013b, true) // Artist
  dv.setUint16(o + 2, 2, true) // ASCII
  dv.setUint32(o + 4, artistB.length, true)
  dv.setUint32(o + 8, artistOffset, true)
  o += 12
  dv.setUint16(o, 0x8769, true) // ExifIFD pointer
  dv.setUint16(o + 2, 4, true) // LONG
  dv.setUint32(o + 4, 1, true)
  dv.setUint32(o + 8, exifIfdOffset, true)
  o += 12
  dv.setUint32(o, 0, true) // 无下一 IFD
  tiff.set(artistB, artistOffset)
  // ExifIFD：UserComment
  dv.setUint16(exifIfdOffset, 1, true)
  const e = exifIfdOffset + 2
  dv.setUint16(e, 0x9286, true)
  dv.setUint16(e + 2, 7, true) // UNDEFINED
  dv.setUint32(e + 4, commentB.length, true)
  dv.setUint32(e + 8, commentOffset, true)
  dv.setUint32(exifIfdOffset + 14, 0, true)
  tiff.set(commentB, commentOffset)

  const app1 = new Uint8Array(6 + tiff.length)
  app1.set([0x45, 0x78, 0x69, 0x66, 0, 0], 0) // "Exif\0\0"
  app1.set(tiff, 6)
  const seg = new Uint8Array(4 + app1.length)
  seg[0] = 0xff
  seg[1] = 0xe1
  // JPEG 段长度 = 自身 2 字节长度字段 + 载荷
  new DataView(seg.buffer).setUint16(2, app1.length + 2, false)
  seg.set(app1, 4)
  return seg
}
