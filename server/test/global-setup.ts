import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export default function setup(): void {
  const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js')
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate', '--force-reset'], {
    cwd: serverRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
    },
  })
}
