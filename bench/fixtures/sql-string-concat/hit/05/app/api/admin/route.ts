import { prisma } from '@/lib/prisma';
export async function POST(req: Request) {
  const body = await req.json();
  await prisma.$executeRawUnsafe(`UPDATE "User" SET role = '${body.role}' WHERE id = '${body.id}'`);
  return Response.json({ ok: true });
}
