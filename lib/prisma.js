import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

export default prisma;
