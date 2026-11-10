import { upgrade } from '@/lib/billing';
export async function POST(req: Request) {
  const event = await req.json();
  if (event.type === 'checkout.session.completed') await upgrade(event.data.object.customer);
  return Response.json({ received: true });
}
