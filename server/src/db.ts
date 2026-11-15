import { PrismaClient } from '@prisma/client'

process.env.DATABASE_URL ||= 'file:../data/dev.db'

export const prisma = new PrismaClient()
