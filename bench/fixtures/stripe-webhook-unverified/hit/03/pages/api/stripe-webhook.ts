import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const event = req.body;
  if (event.type === 'invoice.paid') await markPaid(event.data.object.customer);
  res.status(200).end();
}
