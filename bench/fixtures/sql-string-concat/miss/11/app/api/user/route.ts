import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  return Response.json(await db.execute(sql`select * from users where id = ${id}`));
}
