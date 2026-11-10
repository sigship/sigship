import { prisma } from '@/lib/prisma';
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "Post" WHERE title ILIKE '%${searchParams.get('q')}%'`);
  return Response.json(rows);
}
