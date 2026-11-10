import { pool } from '@/lib/pg';
export async function POST(req: Request) {
  const { from, to } = await req.json();
  const r = await pool.query(`SELECT * FROM orders WHERE created_at BETWEEN '${from}' AND '${to}'`);
  return Response.json(r.rows);
}
