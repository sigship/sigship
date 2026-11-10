export const get = (url: string) => fetch(url, { headers: { 'Access-Control-Allow-Origin': '*' } });
