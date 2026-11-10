import { sql } from 'drizzle-orm';
export const up = sql`create policy "open" on posts for insert with check (true);`;
