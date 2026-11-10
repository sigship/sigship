import sql from '@/lib/sql';
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  return Response.json(await sql`select * from users where id = ${id}`);
}
