import { supabase } from '@/lib/supabase';
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  const { data } = await supabase.from('users').select('*').eq('id', id).single();
  return Response.json(data);
}
