export const GET = async () => Response.json(await load(), { headers: { 'Access-Control-Allow-Origin': '*' } });
