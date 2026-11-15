import { ID_PATTERN } from '@/shared/selection'

/**
 * 将 32 位图片 UUID 写入标准 EXIF ImageUniqueID（0xA420）。
 * 不再把用户名、评选范围或其他业务数据写入图片元数据。
 */
export function embedJpegPictureId(dataUrl: string, pictureId: string): string {
  if (!ID_PATTERN.test(pictureId)) throw new Error('图片标识必须为 32 位小写十六进制 UUID')
  const bytes = dataUrlToBytes(dataUrl)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('仅支持 JPEG 图片')
  const app1 = buildExifApp1(pictureId)
  const out = new Uint8Array(bytes.length + app1.length)
  out.set(bytes.subarray(0, 2), 0)
  out.set(app1, 2)
  out.set(bytes.subarray(2), 2 + app1.length)
  return bytesToDataUrl(out)
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToDataUrl(bytes: Uint8Array): string {
  let bin = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return `data:image/jpeg;base64,${btoa(bin)}`
}

function buildExifApp1(pictureId: string): Uint8Array {
  // TIFF（小端）：头 + IFD0（ExifIFD 指针）+ ExifIFD（ImageUniqueID）+ 33 字节 ASCII。
  const ifd0Size = 2 + 12 + 4
  const exifIfdOffset = 8 + ifd0Size
  const exifSize = 2 + 12 + 4
  const pictureIdOffset = exifIfdOffset + exifSize
  const tiff = new Uint8Array(pictureIdOffset + 33)
  const view = new DataView(tiff.buffer)

  tiff.set([0x49, 0x49], 0)
  view.setUint16(2, 0x2a, true)
  view.setUint32(4, 8, true)

  view.setUint16(8, 1, true)
  view.setUint16(10, 0x8769, true)
  view.setUint16(12, 4, true)
  view.setUint32(14, 1, true)
  view.setUint32(18, exifIfdOffset, true)
  view.setUint32(22, 0, true)

  view.setUint16(exifIfdOffset, 1, true)
  const entry = exifIfdOffset + 2
  view.setUint16(entry, 0xa420, true)
  view.setUint16(entry + 2, 2, true)
  view.setUint32(entry + 4, 33, true)
  view.setUint32(entry + 8, pictureIdOffset, true)
  view.setUint32(exifIfdOffset + 14, 0, true)
  tiff.set(new TextEncoder().encode(`${pictureId}\0`), pictureIdOffset)

  const app1 = new Uint8Array(6 + tiff.length)
  app1.set([0x45, 0x78, 0x69, 0x66, 0, 0], 0)
  app1.set(tiff, 6)
  const segment = new Uint8Array(4 + app1.length)
  segment[0] = 0xff
  segment[1] = 0xe1
  new DataView(segment.buffer).setUint16(2, app1.length + 2, false)
  segment.set(app1, 4)
  return segment
}
