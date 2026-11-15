import { describe, expect, it } from 'vitest'
import { embedJpegPictureId } from '@/lib/posterMeta'

const tinyJpeg = `data:image/jpeg;base64,${btoa('\xff\xd8\xff\xd9')}`

describe('JPEG EXIF 图片标识', () => {
  it('只写入 ImageUniqueID，不写入 Artist 或 UserComment', () => {
    const id = '7f0ee31455254f42ad31d734f9cc73bb'
    const result = embedJpegPictureId(tinyJpeg, id)
    const binary = atob(result.slice(result.indexOf(',') + 1))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const view = new DataView(bytes.buffer)

    expect(binary.startsWith('\xff\xd8\xff\xe1')).toBe(true)
    expect(binary).toContain('Exif\0\0')
    expect(binary).toContain(`${id}\0`)
    expect(view.getUint16(40, true)).toBe(0xa420)
    expect(binary).not.toContain('UserComment')
    expect(binary.endsWith('\xff\xd9')).toBe(true)
  })

  it('拒绝非法图片标识', () => {
    expect(() => embedJpegPictureId(tinyJpeg, 'not-a-uuid')).toThrow('图片标识')
  })
})
