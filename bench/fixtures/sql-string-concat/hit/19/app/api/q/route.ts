import sql from '@/lib/sql';
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q');
  return Response.json(await sql.unsafe(`SELECT * FROM items WHERE name = '${q}'`));
}
