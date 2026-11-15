import { buildApp } from './app.js'
import { config } from './config.js'
import { prisma } from './db.js'

const app = await buildApp()

try {
  await app.listen({ port: config.port, host: config.host })
} catch (error) {
  app.log.error(error)
  await prisma.$disconnect()
  process.exit(1)
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}
