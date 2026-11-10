const HANDLERS = {
  'checkout.session.completed': fulfil,
  'customer.subscription.updated': sync,
  'customer.subscription.deleted': cancel,
};
export async function POST(req: Request) {
  const event = await req.json();
  await HANDLERS[event.type]?.(event.data.object);
  return Response.json({ ok: true });
}
