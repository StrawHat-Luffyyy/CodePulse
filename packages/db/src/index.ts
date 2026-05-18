import {PrismaClient} from '../generated/prisma/client'

declare global {
var __prisma: PrismaClient | undefined
}

declare const process: any

export const db = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
} as any)
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = db
}

export * from '../generated/prisma/client'