Deno.serve(() => new Response('hi', { headers: { 'Access-Control-Allow-Origin': '*' } }));
