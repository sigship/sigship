import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(() => new Response('[]', { headers: corsHeaders }));
