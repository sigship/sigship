import { prisma } from '@/lib/prisma';
export async function POST(req: Request) {
  const { id } = await req.json();
  return Response.json(await prisma.$queryRaw`SELECT * FROM "User" WHERE id = ${id}`);
}
