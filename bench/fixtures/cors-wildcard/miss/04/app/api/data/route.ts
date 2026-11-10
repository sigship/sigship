const allowed = process.env.APP_URL!;
export const GET = () => Response.json({}, { headers: { 'Access-Control-Allow-Origin': allowed } });
