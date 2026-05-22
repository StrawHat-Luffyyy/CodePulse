import {PrismaClient} from '../generated/prisma/client.js'
import 'dotenv/config'

declare global {
var __prisma: PrismaClient | undefined
}

declare const process: any

export const db = globalThis.__prisma || new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
} as any)
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = db
}

export * from '../generated/prisma/client.js'