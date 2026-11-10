import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bG12dHh3a3JwamhnZmRzYWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDE1MDAwMDAwfQ.WMp60FX_WkZVBa9oE8CbAMNqFxYCNJGXc6ld-zvAJK4');

Deno.serve(async () => {
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  return new Response(JSON.stringify({ count }));
});
