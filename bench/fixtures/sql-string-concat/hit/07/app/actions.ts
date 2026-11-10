'use server';
import { db } from '@/lib/db';
export async function addNote(formData: FormData) {
  await db.query(`INSERT INTO notes (body) VALUES ('${formData.get('body')}')`);
}
