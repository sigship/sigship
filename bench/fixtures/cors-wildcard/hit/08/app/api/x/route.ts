const headers = { 'Access-Control-Allow-Origin': "*" };
export const GET = () => Response.json({}, { headers });
