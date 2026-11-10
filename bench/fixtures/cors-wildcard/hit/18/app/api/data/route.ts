export const GET = (req: Request) => Response.json({}, { headers: { 'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*' } });
