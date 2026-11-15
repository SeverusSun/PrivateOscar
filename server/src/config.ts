import path from 'node:path'

export const config = {
  port: Number(process.env.PORT ?? 3100),
  host: process.env.HOST ?? '127.0.0.1',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads')),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  isTest: process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',
}
